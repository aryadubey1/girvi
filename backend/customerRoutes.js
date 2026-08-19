const express = require('express');
const calculateAccruedInterest = require('./interestCalculator');
const buildLoanLedger = require('./buildLoanLedger');
const router = express.Router();
const pool = require('./db');
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

    const result = await pool.query(
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
    const result = await pool.query(
      `SELECT c.*,
        COALESCE(SUM(l.outstanding_principal) + SUM(l.interest_shortfall), 0) as current_balance
       FROM customers c
       LEFT JOIN loans l ON l.customer_id = c.id
       GROUP BY c.id
       ORDER BY current_balance DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customerResult = await pool.query(
      `SELECT * FROM customers WHERE id = $1`,
      [req.params.id]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    const loansResult = await pool.query(
      `SELECT * FROM loans
       WHERE customer_id = $1
         AND (outstanding_principal + interest_shortfall) > 0
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    const loans = [];
    for (const loan of loansResult.rows) {
      const paymentsResult = await pool.query(
        `SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC`,
        [loan.id]
      );
      const payments = paymentsResult.rows;

      const photosResult = await pool.query(
        `SELECT * FROM loan_photos WHERE loan_id = $1`,
        [loan.id]
      );
      const photos = photosResult.rows;

      const lastPaymentDate = payments[0]?.payment_date || loan.loan_date;

      const { daysSincePayment, interestAccrued } = calculateAccruedInterest(
        parseFloat(loan.outstanding_principal),
        parseFloat(loan.interest_rate),
        lastPaymentDate
      );

      const loanWithComputed = {
        ...loan,
        days_since_last_payment: daysSincePayment,
        interest_accrued_today: interestAccrued,
        total_owed: Math.round(
          (parseFloat(loan.outstanding_principal) +
            parseFloat(loan.interest_shortfall) +
            interestAccrued) *
            100
        ) / 100,
      };

      // buildLoanLedger sorts payments internally, so passing the DESC-ordered
      // array straight through (same one used for the payment history list) is fine.
      const ledger = buildLoanLedger(loanWithComputed, payments);

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

    const result = await pool.query(
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
  const client = await pool.connect();
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