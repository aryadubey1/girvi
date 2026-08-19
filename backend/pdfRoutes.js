const express = require('express');
const router = express.Router();
const pool = require('./db');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const calculateAccruedInterest = require('./interestCalculator');
const buildLoanLedger = require('./buildLoanLedger');

// ── Shop details ──
// Hardcoded for now. Update these directly when shop info needs to change.
// TODO (later): move to a shop_settings table if this ever needs to be editable via UI.
const SHOP = {
  name: 'Om Shivam Jewellers',
  address: 'Awadhpuri, Bhopal, Madhya Pradesh',
  phone: '9876543210',
};

// Logo embedded as base64 so Puppeteer can render it without a network request.
// Falls back to no logo if the file isn't present.
function getLogoDataUri() {
  try {
    const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
    const buf = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (err) {
    return null;
  }
}

function formatRupees(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLedgerRows(ledger) {
  return ledger
    .map((row) => {
      const rowClass = row.isSummaryRow ? 'summary-row' : '';
      const interestPaid = row.interestPaid !== null ? `₹${formatRupees(row.interestPaid)}` : '—';
      return `
        <tr class="${rowClass}">
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.event)}</td>
          <td class="num">₹${formatRupees(row.principalBalance)}</td>
          <td class="num">${interestPaid}</td>
          <td class="num">₹${formatRupees(row.interestOwedAtRow)}</td>
        </tr>`;
    })
    .join('');
}

function renderLoanSection(loan) {
  return `
    <div class="loan-section">
      <div class="loan-meta">
        <div><strong>Loan Date:</strong> ${escapeHtml(loan.loan_date)}</div>
        <div><strong>Original Principal:</strong> ₹${formatRupees(loan.original_principal)}</div>
        <div><strong>Interest Rate:</strong> ${escapeHtml(loan.interest_rate)}% per month</div>
        <div><strong>Status:</strong> ${loan.status === 'active' ? 'Active' : 'Closed'}</div>
      </div>
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th class="num">Principal Balance</th>
            <th class="num">Interest Paid</th>
            <th class="num">Interest Outstanding</th>
          </tr>
        </thead>
        <tbody>
          ${renderLedgerRows(loan.ledger)}
        </tbody>
      </table>
    </div>`;
}

function buildInvoiceHtml({ shop, logoDataUri, customer, loans, generatedAt }) {
  const loanSections = loans.map((loan) => renderLoanSection(loan)).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Statement — ${escapeHtml(customer.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #292524;
    padding: 24px 28px;
  }
  .header {
    text-align: center;
    border-bottom: 3px solid #7a1f1f;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .header img {
    height: 44px; width: auto; max-width: 160px;
    display: block; margin: 0 auto 4px;
    object-fit: contain;
  }
  .header .shop-name {
    font-size: 18px;
    font-weight: bold;
    color: #7a1f1f;
    margin-bottom: 2px;
  }
  .header .shop-sub {
    font-size: 9.5px;
    color: #57534E;
    line-height: 1.5;
  }
  .customer-block {
    border: 1px solid #E7E5E4;
    background: #FAF9F6;
    border-radius: 4px;
    padding: 6px 12px;
    margin-bottom: 12px;
    font-size: 10.5px;
    line-height: 1.6;
  }
  .customer-block .row {
    display: table;
    width: 100%;
  }
  .customer-block .col {
    display: table-cell;
    width: 50%;
  }
  .loan-section {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .loan-meta {
    display: table;
    width: 100%;
    border: 1px solid #E7E5E4;
    background: #F5F0E8;
    padding: 5px 10px;
    margin-bottom: 6px;
    font-size: 10px;
    line-height: 1.6;
  }
  .loan-meta div {
    display: table-cell;
    width: 25%;
  }
  .ledger-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  .ledger-table th {
    border: 1px solid #7a1f1f;
    background: #7a1f1f;
    color: #fff;
    padding: 5px 8px;
    text-align: left;
    font-weight: bold;
  }
  .ledger-table th.num, .ledger-table td.num {
    text-align: right;
  }
  .ledger-table td {
    border: 1px solid #E7E5E4;
    padding: 4px 8px;
  }
  .ledger-table tr.summary-row td {
    background: #FEF3C7;
    font-weight: bold;
  }
  .footer-note {
    margin-top: 6px;
    font-size: 9px;
    color: #A8A29E;
  }
  .sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 24px;
    page-break-inside: avoid;
  }
  .sig-table td {
    width: 50%;
    padding-top: 24px;
    font-size: 10px;
    text-align: center;
    vertical-align: bottom;
  }
  .sig-line {
    border-top: 1px solid #A8A29E;
    padding-top: 4px;
    margin: 0 24px;
  }
  .generated-at {
    text-align: right;
    font-size: 8.5px;
    color: #A8A29E;
    margin-top: 4px;
  }
</style>
</head>
<body>

  <div class="header">
    ${logoDataUri ? `<img src="${logoDataUri}" alt="Logo">` : ''}
    <div class="shop-name">${escapeHtml(shop.name)}</div>
    <div class="shop-sub">
      ${escapeHtml(shop.address)}
      ${shop.phone ? ` &nbsp;|&nbsp; Mob.: ${escapeHtml(shop.phone)}` : ''}
    </div>
  </div>

  <div class="customer-block">
    <div class="row">
      <div class="col"><strong>Customer:</strong> ${escapeHtml(customer.name)}</div>
      ${customer.phone ? `<div class="col"><strong>Phone:</strong> ${escapeHtml(customer.phone)}</div>` : ''}
    </div>
    ${customer.address ? `<div><strong>Address:</strong> ${escapeHtml(customer.address)}</div>` : ''}
  </div>

  ${loanSections}

  <table class="sig-table">
    <tr>
      <td><div class="sig-line">Customer Signature</div></td>
      <td><div class="sig-line">${escapeHtml(shop.name)}</div></td>
    </tr>
  </table>

  <div class="generated-at">Generated ${escapeHtml(generatedAt)}</div>

</body>
</html>`;
}

router.get('/customers/:id/pdf', async (req, res) => {
  let browser;
  try {
    const customerResult = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [req.params.id]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    const loansResult = await pool.query(
      'SELECT * FROM loans WHERE customer_id = $1 ORDER BY loan_date ASC',
      [req.params.id]
    );

    if (loansResult.rows.length === 0) {
      return res.status(400).json({ error: 'Customer has no loans to generate a statement for' });
    }

    const loans = [];
    for (const loan of loansResult.rows) {
      const paymentsResult = await pool.query(
        'SELECT * FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC',
        [loan.id]
      );
      const payments = paymentsResult.rows;

      const isActive =
        parseFloat(loan.outstanding_principal) + parseFloat(loan.interest_shortfall) > 0;

      if (isActive) {
        const lastPaymentDate = payments[0]?.payment_date || loan.loan_date;
        const { daysSincePayment, interestAccrued } = calculateAccruedInterest(
          parseFloat(loan.outstanding_principal),
          parseFloat(loan.interest_rate),
          lastPaymentDate
        );
        loan.days_since_last_payment = daysSincePayment;
        loan.interest_accrued_today = interestAccrued;
      } else {
        loan.days_since_last_payment = 0;
        loan.interest_accrued_today = 0;
      }

      const ledger = buildLoanLedger(loan, payments);

      loans.push({
        id: loan.id,
        loan_date: loan.loan_date,
        original_principal: parseFloat(loan.original_principal),
        interest_rate: parseFloat(loan.interest_rate),
        status: isActive ? 'active' : 'closed',
        ledger,
      });
    }

    const html = buildInvoiceHtml({
      shop: SHOP,
      logoDataUri: getLogoDataUri(),
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      loans,
      generatedAt: new Date().toLocaleString('en-IN'),
    });

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    await browser.close();
    browser = null;

    const safeName = (customer.name || 'customer').replace(/[^a-z0-9]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_statement.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;