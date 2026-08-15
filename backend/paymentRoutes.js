const express = require('express');
const router = express.Router();
const pool = require('./db');
const calculateAccruedInterest = require('./interestCalculator');

router.post('/payments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { loan_id, amount_paid, payment_date } = req.body;

    await client.query('BEGIN');

    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [loan_id]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    const lastPaymentResult = await client.query(
      'SELECT payment_date FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC, id DESC LIMIT 1',
      [loan_id]
    );

    const lastDate = lastPaymentResult.rows.length > 0
      ? lastPaymentResult.rows[0].payment_date
      : loan.loan_date;

    const { interestAccrued: newlyAccrued } = calculateAccruedInterest(
      parseFloat(loan.outstanding_principal),
      parseFloat(loan.interest_rate),
      lastDate
    );

    const carriedShortfall = parseFloat(loan.interest_shortfall);
    const totalInterestOwed = Math.round((carriedShortfall + newlyAccrued) * 100) / 100;

    const paid = parseFloat(amount_paid);
    let interestComponent, principalComponent, newOutstandingPrincipal, newShortfall;

    if (paid <= totalInterestOwed) {
      interestComponent = paid;
      principalComponent = 0;
      newOutstandingPrincipal = parseFloat(loan.outstanding_principal);
      newShortfall = Math.round((totalInterestOwed - paid) * 100) / 100;
    } else {
      interestComponent = totalInterestOwed;
      principalComponent = Math.round((paid - totalInterestOwed) * 100) / 100;
      newOutstandingPrincipal = parseFloat(loan.outstanding_principal) - principalComponent;
      newShortfall = 0;
    }

    const paymentResult = await client.query(
      `INSERT INTO payments (loan_id, payment_date, amount_paid, interest_component, principal_component)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [loan_id, payment_date, paid, interestComponent, principalComponent]
    );

    await client.query(
      'UPDATE loans SET outstanding_principal = $1, interest_shortfall = $2 WHERE id = $3',
      [newOutstandingPrincipal, newShortfall, loan_id]
    );

    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    client.release();
  }
});

module.exports = router;