const express = require('express');
const router = express.Router();
const pool = require('./db');

router.get('/dashboard', async (req, res) => {
  try {
    const totalOutResult = await pool.query(
      `SELECT COALESCE(SUM(outstanding_principal) + SUM(interest_shortfall), 0) as total_out
       FROM loans`
    );

    const collectedThisMonthResult = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as collected
       FROM payments
       WHERE payment_date >= date_trunc('month', CURRENT_DATE)`
    );

    const activeCustomersResult = await pool.query(
      `SELECT COUNT(DISTINCT c.id) as count
       FROM customers c
       JOIN loans l ON l.customer_id = c.id
       WHERE (l.outstanding_principal + l.interest_shortfall) > 0`
    );

    const topBorrowersResult = await pool.query(
      `SELECT c.id, c.name,
        SUM(l.outstanding_principal) + SUM(l.interest_shortfall) as total_owed
       FROM customers c
       JOIN loans l ON l.customer_id = c.id
       WHERE (l.outstanding_principal + l.interest_shortfall) > 0
       GROUP BY c.id, c.name
       ORDER BY total_owed DESC
       LIMIT 5`
    );

    const recentPaymentsResult = await pool.query(
      `SELECT p.id, p.amount_paid, p.payment_date, c.name as customer_name, c.id as customer_id
       FROM payments p
       JOIN loans l ON l.id = p.loan_id
       JOIN customers c ON c.id = l.customer_id
       ORDER BY p.payment_date DESC, p.id DESC
       LIMIT 8`
    );

    res.json({
      total_out: totalOutResult.rows[0].total_out,
      collected_this_month: collectedThisMonthResult.rows[0].collected,
      active_customers: parseInt(activeCustomersResult.rows[0].count),
      top_borrowers: topBorrowersResult.rows,
      recent_payments: recentPaymentsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;