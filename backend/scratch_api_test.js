async function testPostLoan() {
  const FormData = require('form-data');
  const fd = new FormData();
  fd.append('customer_id', '1'); // Assuming customer 1 exists
  fd.append('original_principal', '10000');
  fd.append('interest_rate', '2');
  fd.append('loan_date', '2026-09-14');
  fd.append('due_date', '2027-09-14');
  
  try {
    const res = await fetch('http://localhost:3001/api/loans', {
      method: 'POST',
      body: fd
    });
    
    if (!res.ok) {
      console.log('Error:', await res.text());
      return;
    }
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testPostLoan();
