const buildLoanLedger = require('./buildLoanLedger');
const loan = {
  loan_date: '2026-09-14',
  original_principal: '10000.00',
  outstanding_principal: '10000.00',
  interest_rate: '2.00'
};
const ledger = buildLoanLedger(loan, []);
console.log(JSON.stringify(ledger, null, 2));
