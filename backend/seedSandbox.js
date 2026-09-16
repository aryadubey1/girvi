// Seeds the SANDBOX database with large-scale realistic fake data for testing.
// Never run this against prod — it connects to sandboxPool only, on purpose.
//
// Usage: node seedSandbox.js
// Optional: node seedSandbox.js --customers=750 --wipe

require('dotenv').config();
const { sandboxPool } = require('./db');
const buildLoanLedger = require('./buildLoanLedger');

// ---- config ----
const args = process.argv.slice(2);
const wipeFirst = args.includes('--wipe');
const customerCountArg = args.find(a => a.startsWith('--customers='));
const CUSTOMER_COUNT = customerCountArg ? parseInt(customerCountArg.split('=')[1], 10) : 750;

// ---- fake data pools ----
const FIRST_NAMES = [
  'Rajesh', 'Suresh', 'Ramesh', 'Mahesh', 'Dinesh', 'Amit', 'Vijay', 'Sanjay', 'Ajay', 'Vikram',
  'Ravi', 'Manoj', 'Anil', 'Sunil', 'Deepak', 'Ashok', 'Prakash', 'Rakesh', 'Naresh', 'Mukesh',
  'Sunita', 'Anita', 'Geeta', 'Sita', 'Rekha', 'Kavita', 'Meena', 'Sushma', 'Pooja', 'Priya',
  'Neha', 'Ritu', 'Sarita', 'Usha', 'Shobha', 'Kamla', 'Radha', 'Lata', 'Asha', 'Nirmala',
  'Mohammed', 'Salim', 'Aslam', 'Irfan', 'Rashid', 'Fatima', 'Ayesha', 'Zainab', 'Nasreen', 'Shabana',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Jain', 'Singh', 'Yadav', 'Patel', 'Shah', 'Mishra',
  'Tiwari', 'Dubey', 'Pandey', 'Chouhan', 'Rathore', 'Malviya', 'Sahu', 'Sen', 'Khan', 'Ansari',
  'Qureshi', 'Malik', 'Joshi', 'Bhargava', 'Saxena', 'Nigam', 'Kushwaha', 'Rajput', 'Thakur', 'Vishwakarma',
];
const AREAS = [
  'Awadhpuri', 'MP Nagar', 'New Market', 'Kolar Road', 'Shahpura', 'Bagsevania', 'Ayodhya Bypass',
  'Hoshangabad Road', 'Bairagarh', 'Habibganj', 'Arera Colony', 'Govindpura', 'Piplani', 'Karond',
  'Berasia Road', 'Chuna Bhatti', 'Misrod', 'Ashoka Garden', 'Jahangirabad', 'Nehru Nagar',
];
const NOTES_POOL = [
  '', '', '', // most loans have no notes
  'Regular customer', 'Family jewellery', 'Wedding loan', 'Business emergency',
  'Repeat customer, good history', 'First time borrower', 'Urgent requirement',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}
function toDateStr(d) { return d.toISOString().split('T')[0]; }

function randomPastDate(daysAgoMin, daysAgoMax) {
  const daysAgo = randInt(daysAgoMin, daysAgoMax);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

function fakeAadhar() {
  let n = '';
  for (let i = 0; i < 12; i++) n += randInt(0, 9);
  return n;
}
function fakePan() {
  const letters = () => Array.from({ length: 5 }, () => String.fromCharCode(65 + randInt(0, 25))).join('');
  return `${letters()}${randInt(1000, 9999)}${String.fromCharCode(65 + randInt(0, 25))}`;
}
function fakePhone() {
  return `9${randInt(100000000, 999999999)}`;
}

// ---- customer generation ----
function generateCustomer() {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const hasContact = Math.random() > 0.1; // 90% have contact details
  return {
    name,
    phone: hasContact ? fakePhone() : null,
    address: `${randInt(1, 200)}, ${pick(AREAS)}, Bhopal, Madhya Pradesh`,
    aadhar_number: Math.random() > 0.3 ? fakeAadhar() : null,
    pan_number: Math.random() > 0.6 ? fakePan() : null,
    email: null, // kept null — not commonly collected for this business per existing schema usage
  };
}

// ---- loan generation ----
function generateLoanShell(customerId) {
  const loanDate = toDateStr(randomPastDate(30, 540)); // up to ~18 months ago
  const dueDate = addDays(loanDate, randInt(90, 365));
  const principal = randInt(5, 200) * 1000; // 5,000 to 200,000, rounded to thousands
  const rate = randFloat(1.5, 3.5, 2); // % per month, typical gold loan range

  const hasGold = Math.random() > 0.15;
  const hasSilver = !hasGold || Math.random() > 0.6; // most have gold, some have both, few silver-only

  const gold = hasGold ? {
    gold_weight: randFloat(5, 80, 2),
    gold_purity: pick([91.6, 91.6, 91.6, 75, 58.3]), // 22K, 18K, 14K common purities
    gold_rate: randInt(5500, 6800),
  } : { gold_weight: null, gold_purity: null, gold_rate: null };
  if (gold.gold_weight) gold.gold_value = Math.round(gold.gold_weight * (gold.gold_purity / 100) * gold.gold_rate * 100) / 100;
  else gold.gold_value = null;

  const silver = hasSilver ? {
    silver_weight: randFloat(50, 500, 2),
    silver_purity: pick([92.5, 92.5, 80]),
    silver_rate: randInt(75, 95),
  } : { silver_weight: null, silver_purity: null, silver_rate: null };
  if (silver.silver_weight) silver.silver_value = Math.round(silver.silver_weight * (silver.silver_purity / 100) * silver.silver_rate * 100) / 100;
  else silver.silver_value = null;

  return {
    customer_id: customerId,
    original_principal: principal,
    interest_rate: rate,
    loan_date: loanDate,
    due_date: dueDate,
    notes: pick(NOTES_POOL),
    ...gold,
    ...silver,
  };
}

// Simulates a realistic payment history for a loan, using the SAME ledger
// logic the real app uses, so stored outstanding_principal/interest_shortfall
// end up exactly consistent with what buildLoanLedger would compute.
function simulatePaymentHistory(loan) {
  const payments = [];
  const todayStr = toDateStr(new Date());

  // Decide the loan's fate: 30% closed, 10% partial-but-stalled, 60% active/ongoing
  const roll = Math.random();
  const targetOutcome = roll < 0.30 ? 'closed' : roll < 0.40 ? 'partial' : 'active';

  let cursorDate = loan.loan_date;
  const maxMonths = Math.floor((new Date(todayStr) - new Date(loan.loan_date)) / (1000 * 60 * 60 * 24 * 30));
  const numPaymentAttempts = targetOutcome === 'active'
    ? randInt(0, Math.min(maxMonths, 6))
    : randInt(1, Math.max(1, Math.min(maxMonths, 10)));

  for (let i = 0; i < numPaymentAttempts; i++) {
    cursorDate = addDays(cursorDate, randInt(25, 40));
    if (cursorDate >= todayStr) break;

    const ledger = buildLoanLedger(loan, payments);
    const { outstandingPrincipal, interestShortfall } = ledger.finalState;
    const totalOwed = outstandingPrincipal + interestShortfall;
    if (totalOwed <= 0) break;

    let paymentAmount;
    if (targetOutcome === 'closed' && i === numPaymentAttempts - 1) {
      // final payment clears everything
      paymentAmount = totalOwed;
    } else if (targetOutcome === 'closed') {
      // partial paydown, roughly interest + a chunk of principal
      paymentAmount = Math.round((interestShortfall + outstandingPrincipal * randFloat(0.1, 0.4)) * 100) / 100;
    } else {
      // interest-only or near-interest payment, typical for active gold loans
      paymentAmount = Math.round(interestShortfall * randFloat(0.7, 1.15) * 100) / 100;
    }
    paymentAmount = Math.max(1, Math.min(paymentAmount, totalOwed));

    payments.push({
      payment_date: cursorDate,
      amount_paid: paymentAmount,
    });
  }

  return payments;
}

async function main() {
  console.log(`Seeding sandbox with ${CUSTOMER_COUNT} customers...`);

  if (wipeFirst) {
    console.log('Wiping existing sandbox data...');
    await sandboxPool.query('DELETE FROM payments');
    await sandboxPool.query('DELETE FROM loan_photos');
    await sandboxPool.query('DELETE FROM loans');
    await sandboxPool.query('DELETE FROM customers');
  }

  let totalLoans = 0;
  let totalPayments = 0;

  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const c = generateCustomer();
    const custResult = await sandboxPool.query(
      `INSERT INTO customers (name, phone, address, aadhar_number, pan_number, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [c.name, c.phone, c.address, c.aadhar_number, c.pan_number, c.email]
    );
    const customerId = custResult.rows[0].id;

    const numLoans = randInt(1, 3);
    for (let j = 0; j < numLoans; j++) {
      const loanShell = generateLoanShell(customerId);
      const initialInterest = Math.round((loanShell.original_principal * loanShell.interest_rate) / 100);

      const loanResult = await sandboxPool.query(
        `INSERT INTO loans (
           customer_id, original_principal, outstanding_principal, interest_rate, loan_date, due_date, notes,
           gold_weight, gold_rate, gold_purity, gold_value,
           silver_weight, silver_rate, silver_purity, silver_value,
           interest_shortfall
         )
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          loanShell.customer_id, loanShell.original_principal, loanShell.interest_rate,
          loanShell.loan_date, loanShell.due_date, loanShell.notes || null,
          loanShell.gold_weight, loanShell.gold_rate, loanShell.gold_purity, loanShell.gold_value,
          loanShell.silver_weight, loanShell.silver_rate, loanShell.silver_purity, loanShell.silver_value,
          initialInterest,
        ]
      );
      const loan = loanResult.rows[0];
      totalLoans++;

      const payments = simulatePaymentHistory(loan);

      // Replay payments through the same running-ledger logic paymentRoutes.js
      // uses, applying each one in sequence so stored balances stay consistent.
      let appliedPayments = [];
      for (const pmt of payments) {
        const ledger = buildLoanLedger(loan, appliedPayments);
        const { outstandingPrincipal, interestShortfall } = ledger.finalState;
        const totalInterestOwed = interestShortfall;
        const paid = pmt.amount_paid;

        let interestComponent, principalComponent, newOutstandingPrincipal, newShortfall;
        if (paid <= totalInterestOwed) {
          interestComponent = paid;
          principalComponent = 0;
          newOutstandingPrincipal = outstandingPrincipal;
          newShortfall = Math.round((totalInterestOwed - paid) * 100) / 100;
        } else {
          interestComponent = totalInterestOwed;
          principalComponent = Math.round((paid - totalInterestOwed) * 100) / 100;
          newOutstandingPrincipal = outstandingPrincipal - principalComponent;
          newShortfall = 0;
        }

        await sandboxPool.query(
          `INSERT INTO payments (loan_id, payment_date, amount_paid, interest_component, principal_component)
           VALUES ($1, $2, $3, $4, $5)`,
          [loan.id, pmt.payment_date, paid, interestComponent, principalComponent]
        );

        await sandboxPool.query(
          `UPDATE loans SET outstanding_principal = $1, interest_shortfall = $2 WHERE id = $3`,
          [newOutstandingPrincipal, newShortfall, loan.id]
        );
        loan.outstanding_principal = newOutstandingPrincipal;
        loan.interest_shortfall = newShortfall;

        appliedPayments.push({ ...pmt, interest_component: interestComponent, principal_component: principalComponent });
        totalPayments++;
      }

      // Small chance a closed/old loan is soft-deleted, for UI testing of that state
      if (loan.outstanding_principal <= 0 && loan.interest_shortfall <= 0 && Math.random() < 0.15) {
        await sandboxPool.query('UPDATE loans SET is_deleted = true WHERE id = $1', [loan.id]);
      }
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${CUSTOMER_COUNT} customers done (${totalLoans} loans, ${totalPayments} payments so far)`);
    }
  }

  console.log(`Done. Created ${CUSTOMER_COUNT} customers, ${totalLoans} loans, ${totalPayments} payments.`);
  await sandboxPool.end();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
