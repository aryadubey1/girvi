'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewLoan() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');

  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [loanDate, setLoanDate] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/customers', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCustomers(data);
      });
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = customers.some(
    c => c.name.toLowerCase() === search.toLowerCase()
  );

  async function handleCreateLoan(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let customerId = selectedCustomer?.id;

      if (!customerId) {
        const customerRes = await fetch('http://localhost:3001/api/customers', {
          method: 'POST',
          credentials: 'include',
          body: (() => {
            const fd = new FormData();
            fd.append('name', newCustomerName);
            return fd;
          })(),
        });
        if (!customerRes.ok) throw new Error('Failed to create customer');
        const newCustomer = await customerRes.json();
        customerId = newCustomer.id;
      }

      const loanFormData = new FormData();
      loanFormData.append('customer_id', customerId);
      loanFormData.append('original_principal', principal);
      loanFormData.append('interest_rate', rate);
      loanFormData.append('loan_date', loanDate);
      loanFormData.append('notes', notes);
      photos.forEach(file => loanFormData.append('photos', file));

      const loanRes = await fetch('http://localhost:3001/api/loans', {
        method: 'POST',
        credentials: 'include',
        body: loanFormData,
      });
      if (!loanRes.ok) throw new Error('Failed to create loan');

      router.push(`/customers/${customerId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (!selectedCustomer && !newCustomerName) {
    return (
      <div className="p-6 max-w-md">
        <Link href="/" className="text-sm text-[#A16207] hover:underline">
          &larr; Back to customers
        </Link>
        <h1 className="text-xl font-semibold text-[#292524] mt-2 mb-4">New loan</h1>

        <input
          type="text"
          placeholder="Search customer by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg mb-3"
        />

        {search && filteredCustomers.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCustomer(c)}
            className="w-full text-left bg-white border border-[#E7E5E4] rounded-lg px-4 py-2 mb-2 hover:border-[#D6D3D1]"
          >
            {c.name}
          </button>
        ))}

        {search && !exactMatch && (
          <button
            onClick={() => setNewCustomerName(search)}
            className="w-full text-left bg-[#FDF6E7] border border-[#E7E5E4] rounded-lg px-4 py-2 text-[#A16207] font-medium hover:border-[#D6D3D1]"
          >
            + Create new customer "{search}"
          </button>
        )}
      </div>
    );
  }

  const customerLabel = selectedCustomer?.name || newCustomerName;

  return (
    <div className="p-6 max-w-md">
      <button
        onClick={() => {
          setSelectedCustomer(null);
          setNewCustomerName('');
        }}
        className="text-sm text-[#A16207] hover:underline"
      >
        &larr; Change customer
      </button>
      <h1 className="text-xl font-semibold text-[#292524] mt-2 mb-1">New loan</h1>
      <p className="text-sm text-[#78716C] mb-4">For {customerLabel}</p>

      <form onSubmit={handleCreateLoan} className="flex flex-col gap-3">
        <div>
          <label className="text-sm text-[#57534E] block mb-1">Loan amount</label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
            min="1"
            step="0.01"
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Interest rate (% per month)</label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
            min="0"
            step="0.01"
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Loan date</label>
          <input
            type="date"
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            required
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Jewellery photos</label>
          <div className="flex gap-2">
            <label className="flex-1 text-center border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#292524] cursor-pointer hover:border-[#D6D3D1]">
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) =>
                  setPhotos(prev => [...prev, ...Array.from(e.target.files)])
                }
                className="hidden"
              />
            </label>
            <label className="flex-1 text-center border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#292524] cursor-pointer hover:border-[#D6D3D1]">
              Choose from gallery
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setPhotos(prev => [...prev, ...Array.from(e.target.files)])
                }
                className="hidden"
              />
            </label>
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {photos.map((file, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Photo ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-[#E7E5E4]"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-[#E7E5E4] rounded-full text-xs text-[#78716C] flex items-center justify-center hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-700 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#A16207] hover:bg-[#854D0E] text-white px-4 py-2 rounded-lg font-medium mt-2 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Create loan'}
        </button>
      </form>
    </div>
  );
}