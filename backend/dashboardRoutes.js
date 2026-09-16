const express = require('express');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const buildLoanLedger = require('./buildLoanLedger');

    const activeLoansResult = await req.db.query(
      `SELECT l.*, c.name as customer_name 
       FROM loans l 
       JOIN customers c ON c.id = l.customer_id 
       WHERE l.is_deleted = false AND (l.outstanding_principal + l.interest_shortfall) > 0`
    );
    const activeLoans = activeLoansResult.rows;

    const principalGivenMonthResult = await req.db.query(
      `SELECT COALESCE(SUM(original_principal), 0) as total
       FROM loans
       WHERE loan_date >= date_trunc('month', CURRENT_DATE) AND is_deleted = false`
    );

    const principalReceivedMonthResult = await req.db.query(
      `SELECT COALESCE(SUM(principal_component), 0) as total
       FROM payments
       WHERE payment_date >= date_trunc('month', CURRENT_DATE)`
    );

    const interestReceivedMonthResult = await req.db.query(
      `SELECT COALESCE(SUM(interest_component), 0) as total
       FROM payments
       WHERE payment_date >= date_trunc('month', CURRENT_DATE)`
    );
    const paymentsResult = await req.db.query(
      `SELECT * FROM payments 
       WHERE loan_id IN (SELECT id FROM loans WHERE is_deleted = false AND (outstanding_principal + interest_shortfall) > 0) 
       ORDER BY payment_date ASC`
    );
    const allPayments = paymentsResult.rows;

    const paymentsByLoanId = {};
    for (const p of allPayments) {
      if (!paymentsByLoanId[p.loan_id]) paymentsByLoanId[p.loan_id] = [];
      paymentsByLoanId[p.loan_id].push(p);
    }

    let totalOut = 0;
    let totalInterestOut = 0;
    const activeCustomersSet = new Set();
    const borrowerTotals = {};

    for (const loan of activeLoans) {
      const payments = paymentsByLoanId[loan.id] || [];
      const ledger = buildLoanLedger(loan, payments);
      const totalOwed = ledger.finalState.totalOwed;
      const interestShortfall = ledger.finalState.interestShortfall;
      
      if (totalOwed > 0) {
        totalOut += totalOwed;
        totalInterestOut += interestShortfall;
        activeCustomersSet.add(loan.customer_id);
        
        if (!borrowerTotals[loan.customer_id]) {
          borrowerTotals[loan.customer_id] = { id: loan.customer_id, name: loan.customer_name, total_owed: 0 };
        }
        borrowerTotals[loan.customer_id].total_owed += totalOwed;
      }
    }

    const topBorrowers = Object.values(borrowerTotals)
      .sort((a, b) => b.total_owed - a.total_owed)
      .slice(0, 5);

    const recentPaymentsResult = await req.db.query(
      `SELECT p.id, p.amount_paid, p.payment_date, c.name as customer_name, c.id as customer_id
       FROM payments p
       JOIN loans l ON l.id = p.loan_id
       JOIN customers c ON c.id = l.customer_id
       ORDER BY p.payment_date DESC, p.id DESC
       LIMIT 8`
    );

    res.json({
      total_out: totalOut,
      total_interest_out: totalInterestOut,
      principal_given_month: principalGivenMonthResult.rows[0].total,
      principal_received_month: principalReceivedMonthResult.rows[0].total,
      interest_received_month: interestReceivedMonthResult.rows[0].total,
      active_customers: activeCustomersSet.size,
      top_borrowers: topBorrowers,
      recent_payments: recentPaymentsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;