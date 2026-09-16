const express = require('express');
const router = express.Router();
const buildLoanLedger = require('./buildLoanLedger');
router.post('/payments', async (req, res) => {
  const client = await req.db.connect();
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

    const paymentsResult = await client.query(
      'SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date ASC',
      [loan_id]
    );
    const payments = paymentsResult.rows;

    // Run the ledger to find the exact dynamically calculated balance as of today
    const ledger = buildLoanLedger(loan, payments);
    const { outstandingPrincipal, interestShortfall, totalOwed } = ledger.finalState;
    const totalInterestOwed = interestShortfall;

    const paid = parseFloat(amount_paid);
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