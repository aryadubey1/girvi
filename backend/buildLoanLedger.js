const DAYS_IN_MONTH = 30; // Must match interestCalculator.js

function daysBetween(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function accruedBetween(principal, interestRate, fromDate, toDate) {
  const days = daysBetween(fromDate, toDate);
  if (days <= 0) return 0;
  const dailyRate = (interestRate / 100) / DAYS_IN_MONTH;
  return Math.round(principal * dailyRate * days * 100) / 100;
}

/**
 * Replays a loan's payment history into ledger rows.
 *
 * @param {object} loan - loan row; must include original_principal, loan_date,
 *   interest_rate, outstanding_principal, interest_shortfall.
 *   For active loans the caller must also attach days_since_last_payment
 *   and interest_accrued_today (from calculateAccruedInterest).
 * @param {object[]} payments - payment rows (any order — sorted ascending inside).
 * @returns {object[]} ledger rows, oldest first.
 */
function buildLoanLedger(loan, payments) {
  const sorted = [...payments].sort(
    (a, b) => new Date(a.payment_date) - new Date(b.payment_date)
  );

  const rate = parseFloat(loan.interest_rate);
  let runningPrincipal = parseFloat(loan.original_principal);
  let runningInterestOwed = 0;

  const rows = [];

  // Row 1 — disbursement
  rows.push({
    date: loan.loan_date,
    event: 'Loan disbursed',
    principalBalance: runningPrincipal,
    interestPaid: null,
    interestOwedAtRow: 0,
  });

  let previousDate = loan.loan_date;

  for (const pmt of sorted) {
    const accrued = accruedBetween(runningPrincipal, rate, previousDate, pmt.payment_date);
    const interestOwedAtThisPayment = runningInterestOwed + accrued;

    const interestComp = parseFloat(pmt.interest_component);
    const principalComp = parseFloat(pmt.principal_component);

    const interestOwedAfter =
      Math.round((interestOwedAtThisPayment - interestComp) * 100) / 100;

    if (interestOwedAfter < 0) {
      console.warn(
        `buildLoanLedger: negative interestOwedAtRow (${interestOwedAfter}) ` +
        `for loan ${loan.id}, payment ${pmt.id}. ` +
        `interest_component ${interestComp} exceeds computed owed ${interestOwedAtThisPayment.toFixed(2)}.`
      );
    }

    runningPrincipal = Math.round((runningPrincipal - principalComp) * 100) / 100;
    runningInterestOwed = interestOwedAfter;

    rows.push({
      date: pmt.payment_date,
      event: 'Payment received',
      principalBalance: runningPrincipal,
      interestPaid: interestComp,
      interestOwedAtRow: interestOwedAfter,
      paymentTotal: parseFloat(pmt.amount_paid),
    });

    previousDate = pmt.payment_date;
  }

  // Final "today" row — only for active loans
  const isActive =
    parseFloat(loan.outstanding_principal) + parseFloat(loan.interest_shortfall) > 0;

  if (isActive) {
    // Use our own runningInterestOwed (tracked correctly through the replay loop above),
    // not loan.interest_shortfall — that's a separate DB-stored calculation from
    // paymentRoutes.js and can drift by ~₹1 from this one.
    const todayInterestOwed =
      Math.round((runningInterestOwed + parseFloat(loan.interest_accrued_today)) * 100) / 100;

    rows.push({
      date: 'Today',
      event: `Interest accrued (${loan.days_since_last_payment} days @ ${loan.interest_rate}%/mo)`,
      principalBalance: runningPrincipal,
      interestPaid: null,
      interestOwedAtRow: todayInterestOwed,
      isSummaryRow: true,
    });
  }

  return rows;
}

module.exports = buildLoanLedger;