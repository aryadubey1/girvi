const express = require('express');
const router = express.Router();
const pool = require('./db');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/loans',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post('/loans', upload.array('photos', 10), async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer_id, original_principal, interest_rate, loan_date, notes } = req.body;

    await client.query('BEGIN');

    const loanResult = await client.query(
      `INSERT INTO loans (customer_id, original_principal, outstanding_principal, interest_rate, loan_date, notes)
       VALUES ($1, $2, $2, $3, $4, $5)
       RETURNING *`,
      [customer_id, original_principal, interest_rate, loan_date, notes || null]
    );

    const loan = loanResult.rows[0];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(
          `INSERT INTO loan_photos (loan_id, photo_path) VALUES ($1, $2)`,
          [loan.id, file.path]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(loan);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create loan' });
  } finally {
    client.release();
  }
});

router.put('/loans/:id', async (req, res) => {
  try {
    const { notes } = req.body;

    const result = await pool.query(
      `UPDATE loans SET notes = $1 WHERE id = $2 RETURNING *`,
      [notes || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

router.delete('/loans/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`DELETE FROM payments WHERE loan_id = $1`, [req.params.id]);
    await client.query(`DELETE FROM loan_photos WHERE loan_id = $1`, [req.params.id]);
    const result = await client.query(
      `DELETE FROM loans WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete loan' });
  } finally {
    client.release();
  }
});

router.post('/loans/:id/photos', upload.array('photos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos provided' });
    }

    const inserted = [];
    for (const file of req.files) {
      const result = await pool.query(
        `INSERT INTO loan_photos (loan_id, photo_path) VALUES ($1, $2) RETURNING *`,
        [req.params.id, file.path]
      );
      inserted.push(result.rows[0]);
    }

    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add photos' });
  }
});

router.delete('/loans/:loanId/photos/:photoId', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM loan_photos WHERE id = $1 AND loan_id = $2 RETURNING *`,
      [req.params.photoId, req.params.loanId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;