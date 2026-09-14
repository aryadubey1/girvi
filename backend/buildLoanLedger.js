const DAYS_IN_MONTH = 30;

function daysBetween(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function accruedBetween(principal, interestRate, loanDate, fromDate, toDate) {
  const daysFromStartToFrom = daysBetween(loanDate, fromDate);
  const daysFromStartToTo = daysBetween(loanDate, toDate);

  if (daysFromStartToTo <= daysFromStartToFrom) return 0;

  // Since the first 30 days are applied upfront, we only accrue for days beyond 30.
  const effectiveFrom = Math.max(daysFromStartToFrom, 30);
  const effectiveTo = Math.max(daysFromStartToTo, 30);

  const daysToAccrue = effectiveTo - effectiveFrom;
  if (daysToAccrue <= 0) return 0;

  const dailyRate = (interestRate / 100) / DAYS_IN_MONTH;
  return Math.round(principal * dailyRate * daysToAccrue * 100) / 100;
}

function buildLoanLedger(loan, payments) {
  const rate = parseFloat(loan.interest_rate);
  let runningPrincipal = parseFloat(loan.original_principal);
  // Initial 1 month interest
  let runningInterestOwed = Math.round(runningPrincipal * (rate / 100) * 100) / 100;

  const rows = [];

  rows.push({
    date: loan.loan_date,
    event: 'Loan disbursed (1 month interest upfront)',
    principalBalance: runningPrincipal,
    interestPaid: null,
    interestOwedAtRow: runningInterestOwed,
  });

  const events = [];
  for (const pmt of payments) {
    events.push({ type: 'payment', date: pmt.payment_date, data: pmt });
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  const maxDate = payments.length > 0 && payments[payments.length - 1].payment_date > todayStr
    ? payments[payments.length - 1].payment_date
    : todayStr;

  let daysSinceStart = daysBetween(loan.loan_date, maxDate);
  let compDay = 360;
  while (compDay <= daysSinceStart) {
    const compDateObj = new Date(loan.loan_date + 'T00:00:00Z');
    compDateObj.setUTCDate(compDateObj.getUTCDate() + compDay);
    const compDateStr = compDateObj.toISOString().split('T')[0];
    events.push({ type: 'compounding', date: compDateStr });
    compDay += 360;
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
    if (a.type === b.type) return 0;
    return a.type === 'payment' ? -1 : 1;
  });

  let previousDate = loan.loan_date;

  for (const ev of events) {
    const accrued = accruedBetween(runningPrincipal, rate, loan.loan_date, previousDate, ev.date);
    runningInterestOwed += accrued;
    runningInterestOwed = Math.round(runningInterestOwed * 100) / 100;

    if (ev.type === 'payment') {
      const pmt = ev.data;
      const interestComp = parseFloat(pmt.interest_component) || 0;
      const principalComp = parseFloat(pmt.principal_component) || 0;

      const interestOwedAfter = Math.round((runningInterestOwed - interestComp) * 100) / 100;
      runningPrincipal = Math.round((runningPrincipal - principalComp) * 100) / 100;
      runningInterestOwed = interestOwedAfter;

      rows.push({
        date: ev.date,
        event: 'Payment received',
        principalBalance: runningPrincipal,
        interestPaid: interestComp,
        interestOwedAtRow: runningInterestOwed,
        paymentTotal: parseFloat(pmt.amount_paid),
      });
    } else if (ev.type === 'compounding') {
      if (runningInterestOwed > 0) {
        runningPrincipal += runningInterestOwed;
        runningPrincipal = Math.round(runningPrincipal * 100) / 100;
        
        rows.push({
          date: ev.date,
          event: 'Yearly Compounding (Unpaid interest added to principal)',
          principalBalance: runningPrincipal,
          interestPaid: null,
          interestOwedAtRow: 0,
        });
        runningInterestOwed = 0;
      }
    }
    previousDate = ev.date;
  }

  const isActive = runningPrincipal > 0;
  if (isActive && previousDate !== todayStr && new Date(todayStr) > new Date(loan.loan_date)) {
    const accrued = accruedBetween(runningPrincipal, rate, loan.loan_date, previousDate, todayStr);
    runningInterestOwed += accrued;
    runningInterestOwed = Math.round(runningInterestOwed * 100) / 100;

    rows.push({
      date: 'Today',
      event: `Interest accrued to date`,
      principalBalance: runningPrincipal,
      interestPaid: null,
      interestOwedAtRow: runningInterestOwed,
      isSummaryRow: true,
    });
  } else if (isActive && previousDate === todayStr) {
      // If the last event was today, we just add a summary row so the UI has a 'Today' row
      rows.push({
          date: 'Today',
          event: `Current Balance`,
          principalBalance: runningPrincipal,
          interestPaid: null,
          interestOwedAtRow: runningInterestOwed,
          isSummaryRow: true,
      });
  }

  // To support external callers that need the final dynamically calculated state
  rows.finalState = {
    outstandingPrincipal: runningPrincipal,
    interestShortfall: runningInterestOwed,
    totalOwed: runningPrincipal + runningInterestOwed
  };

  return rows;
}

module.exports = buildLoanLedger;
