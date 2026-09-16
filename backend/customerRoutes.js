const express = require('express');
// calculateAccruedInterest is no longer used, ledger handles it
const buildLoanLedger = require('./buildLoanLedger');
const router = express.Router();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/customers',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

function validateIdentityFields({ aadhar_number, pan_number, email }) {
  if (aadhar_number && !/^\d{12}$/.test(aadhar_number)) {
    return 'Aadhar number must be exactly 12 digits';
  }
  if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan_number)) {
    return 'PAN number must be in the format ABCDE1234F';
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email address is not valid';
  }
  return null;
}

router.post('/customers', upload.single('photo'), async (req, res) => {
  try {
    const { name, phone, address, aadhar_number, pan_number, email } = req.body;

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    const identityError = validateIdentityFields({ aadhar_number, pan_number, email });
    if (identityError) {
      return res.status(400).json({ error: identityError });
    }

    const photoPath = req.file ? req.file.path : null;

    const result = await req.db.query(
      `INSERT INTO customers (name, phone, address, photo_path, aadhar_number, pan_number, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, phone, address, photoPath, aadhar_number || null, pan_number || null, email || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});


router.get('/customers', async (req, res) => {
  try {
    const customersResult = await req.db.query('SELECT * FROM customers');
    const customers = customersResult.rows;

    const activeLoansResult = await req.db.query(
      'SELECT * FROM loans WHERE is_deleted = false AND (outstanding_principal + interest_shortfall) > 0'
    );
    const activeLoans = activeLoansResult.rows;

    const paymentsResult = await req.db.query(
      'SELECT * FROM payments WHERE loan_id IN (SELECT id FROM loans WHERE is_deleted = false AND (outstanding_principal + interest_shortfall) > 0) ORDER BY payment_date ASC'
    );
    const allPayments = paymentsResult.rows;

    const paymentsByLoanId = {};
    for (const p of allPayments) {
      if (!paymentsByLoanId[p.loan_id]) paymentsByLoanId[p.loan_id] = [];
      paymentsByLoanId[p.loan_id].push(p);
    }

    const customerBalances = {};
    for (const loan of activeLoans) {
      const payments = paymentsByLoanId[loan.id] || [];
      const ledger = buildLoanLedger(loan, payments);
      if (!customerBalances[loan.customer_id]) customerBalances[loan.customer_id] = 0;
      customerBalances[loan.customer_id] += ledger.finalState.totalOwed;
    }

    const customersWithBalances = customers.map(c => ({
      ...c,
      current_balance: customerBalances[c.id] || 0
    })).sort((a, b) => b.current_balance - a.current_balance);

    res.json(customersWithBalances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customerResult = await req.db.query(
      `SELECT * FROM customers WHERE id = $1`,
      [req.params.id]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    const loansResult = await req.db.query(
      `SELECT * FROM loans
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    const loans = [];
    for (const loan of loansResult.rows) {
      const paymentsResult = await req.db.query(
        `SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC`,
        [loan.id]
      );
      const payments = paymentsResult.rows;

      const photosResult = await req.db.query(
        `SELECT * FROM loan_photos WHERE loan_id = $1`,
        [loan.id]
      );
      const photos = photosResult.rows;

      // buildLoanLedger sorts payments internally
      const ledger = buildLoanLedger(loan, payments);
      const { outstandingPrincipal, interestShortfall, totalOwed } = ledger.finalState;

      const loanWithComputed = {
        ...loan,
        outstanding_principal: outstandingPrincipal,
        interest_shortfall: interestShortfall,
        total_owed: totalOwed,
      };

      loans.push({
        ...loanWithComputed,
        payments,
        photos,
        ledger,
      });
    }

    res.json({ ...customer, loans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customer detail' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { name, phone, address, aadhar_number, pan_number, email } = req.body;

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    const identityError = validateIdentityFields({ aadhar_number, pan_number, email });
    if (identityError) {
      return res.status(400).json({ error: identityError });
    }

    const result = await req.db.query(
      `UPDATE customers
       SET name = $1, phone = $2, address = $3, aadhar_number = $4, pan_number = $5, email = $6
       WHERE id = $7 RETURNING *`,
      [name, phone, address, aadhar_number || null, pan_number || null, email || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  const client = await req.db.connect();
  try {
    await client.query('BEGIN');

    const loansResult = await client.query(
      `SELECT id FROM loans WHERE customer_id = $1`,
      [req.params.id]
    );

    for (const loan of loansResult.rows) {
      await client.query(`DELETE FROM payments WHERE loan_id = $1`, [loan.id]);
      await client.query(`DELETE FROM loan_photos WHERE loan_id = $1`, [loan.id]);
    }

    await client.query(`DELETE FROM loans WHERE customer_id = $1`, [req.params.id]);

    const result = await client.query(
      `DELETE FROM customers WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete customer' });
  } finally {
    client.release();
  }
});

module.exports = router;