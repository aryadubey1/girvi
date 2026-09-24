const express = require('express');
const router = express.Router();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/loans',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post('/loans', upload.array('photos', 10), async (req, res) => {
  const client = await req.db.connect();
  try {
    const {
      customer_id, original_principal, interest_rate, loan_date, due_date, notes,
      gold_weight, gold_rate, gold_purity, gold_value,
      silver_weight, silver_rate, silver_purity, silver_value
    } = req.body;

    if (!due_date) {
      return res.status(400).json({ error: 'due_date is required' });
    }
    if ((gold_weight || gold_rate || gold_value) && !gold_purity) {
      return res.status(400).json({ error: 'Gold purity is required when gold details are provided' });
    }
    if ((silver_weight || silver_rate || silver_value) && !silver_purity) {
      return res.status(400).json({ error: 'Silver purity is required when silver details are provided' });
    }

    await client.query('BEGIN');

    const initial_interest = Math.round((parseFloat(original_principal) * parseFloat(interest_rate)) / 100);

    const loanResult = await client.query(
      `INSERT INTO loans (
         customer_id, original_principal, outstanding_principal, interest_rate, loan_date, due_date, notes,
         gold_weight, gold_rate, gold_purity, gold_value,
         silver_weight, silver_rate, silver_purity, silver_value,
         interest_shortfall
       )
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        customer_id, original_principal, interest_rate, loan_date, due_date || null, notes || null,
        gold_weight || null, gold_rate || null, gold_purity || null, gold_value || null,
        silver_weight || null, silver_rate || null, silver_purity || null, silver_value || null,
        initial_interest
      ]
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
    
    // Compute the ledger for the new loan so frontend has it immediately
    const buildLoanLedger = require('./buildLoanLedger');
    const ledger = buildLoanLedger(loan, []);
    
    res.status(201).json({ ...loan, ledger });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create loan' });
  } finally {
    client.release();
  }
});

router.put('/loans/:id', async (req, res) => {
  const client = await req.db.connect();
  try {
    const {
      original_principal, interest_rate, loan_date, due_date, notes,
      gold_weight, gold_rate, gold_purity, gold_value,
      silver_weight, silver_rate, silver_purity, silver_value
    } = req.body;

    await client.query('BEGIN');

    const oldLoanResult = await client.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
    if (oldLoanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }
    const oldLoan = oldLoanResult.rows[0];

    // Compute outstanding principal if original_principal changed? Actually just update original_principal. The ledger handles current logic.
    // However, outstanding_principal is derived from original_principal minus payments. 
    // In girvi, outstanding_principal is initially set to original_principal, and updated as payments are made.
    // It's safer to leave outstanding_principal out of this unless strictly needed, but let's assume original_principal can be edited and outstanding_principal might need manual adjust, but actually we shouldn't touch outstanding_principal here unless payments are re-applied. Since payments are re-applied via ledger, let's just update original_principal for now, wait, no, outstanding_principal is updated on payments. 
    // Let's just update what is provided.
    
    // Prepare updates
    const updates = {};
    if (original_principal !== undefined) updates.original_principal = original_principal;
    if (interest_rate !== undefined) updates.interest_rate = interest_rate;
    if (loan_date !== undefined) updates.loan_date = loan_date;
    if (due_date !== undefined) updates.due_date = due_date;
    if (notes !== undefined) updates.notes = notes;
    if (gold_weight !== undefined) updates.gold_weight = gold_weight;
    if (gold_rate !== undefined) updates.gold_rate = gold_rate;
    if (gold_purity !== undefined) updates.gold_purity = gold_purity;
    if (gold_value !== undefined) updates.gold_value = gold_value;
    if (silver_weight !== undefined) updates.silver_weight = silver_weight;
    if (silver_rate !== undefined) updates.silver_rate = silver_rate;
    if (silver_purity !== undefined) updates.silver_purity = silver_purity;
    if (silver_value !== undefined) updates.silver_value = silver_value;

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIdx}`);
      values.push(value);
      paramIdx++;
    }

    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      return res.json(oldLoan);
    }

    values.push(req.params.id);
    const updateQuery = `UPDATE loans SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    
    const result = await client.query(updateQuery, values);
    const newLoan = result.rows[0];

    // Record history
    for (const key of Object.keys(updates)) {
      // Postgres dates may come back as Date objects, we compare loosely or as string
      let oldVal = oldLoan[key];
      let newVal = newLoan[key];

      if (oldVal instanceof Date) oldVal = oldVal.toISOString().split('T')[0];
      if (newVal instanceof Date) newVal = newVal.toISOString().split('T')[0];
      
      // Handle numeric comparisons properly to avoid false positives (e.g. 10.00 vs 10)
      if (oldVal != newVal && !(oldVal == null && newVal === '')) {
        await client.query(
          `INSERT INTO loan_history (loan_id, field_name, old_value, new_value) VALUES ($1, $2, $3, $4)`,
          [req.params.id, key, oldVal?.toString() || '', newVal?.toString() || '']
        );
      }
    }

    await client.query('COMMIT');
    res.json(newLoan);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update loan' });
  } finally {
    client.release();
  }
});

router.delete('/loans/:id', async (req, res) => {
  try {
    const result = await req.db.query(
      `UPDATE loans SET is_deleted = true WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

router.post('/loans/:id/photos', upload.array('photos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos provided' });
    }

    const inserted = [];
    for (const file of req.files) {
      const result = await req.db.query(
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
    const result = await req.db.query(
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