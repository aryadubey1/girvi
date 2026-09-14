const { query } = require('./db');

async function testDashboard() {
  try {
    const buildLoanLedger = require('./buildLoanLedger');
    const pool = { query };

    const activeLoansResult = await pool.query(
      `SELECT l.*, c.name as customer_name 
       FROM loans l 
       JOIN customers c ON c.id = l.customer_id 
       WHERE l.is_deleted = false AND (l.outstanding_principal + l.interest_shortfall) > 0`
    );
    const activeLoans = activeLoansResult.rows;

    const principalGivenMonthResult = await pool.query(
      `SELECT COALESCE(SUM(original_principal), 0) as total
       FROM loans
       WHERE loan_date >= date_trunc('month', CURRENT_DATE) AND is_deleted = false`
    );

    const principalReceivedMonthResult = await pool.query(
      `SELECT COALESCE(SUM(principal_component), 0) as total
       FROM payments
       WHERE payment_date >= date_trunc('month', CURRENT_DATE)`
    );

    const interestReceivedMonthResult = await pool.query(
      `SELECT COALESCE(SUM(interest_component), 0) as total
       FROM payments
       WHERE payment_date >= date_trunc('month', CURRENT_DATE)`
    );
    
    console.log("Given:", principalGivenMonthResult.rows[0].total);
    console.log("Prin Recv:", principalReceivedMonthResult.rows[0].total);
    console.log("Int Recv:", interestReceivedMonthResult.rows[0].total);
  } catch(e) {
    console.error(e);
  }
}
testDashboard();
