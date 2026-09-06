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
  const [dueDate, setDueDate] = useState('');
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');

  const [goldWeight, setGoldWeight] = useState('');
  const [goldPurity, setGoldPurity] = useState('');
  const [goldRate, setGoldRate] = useState('');
  const [silverWeight, setSilverWeight] = useState('');
  const [silverPurity, setSilverPurity] = useState('');
  const [silverRate, setSilverRate] = useState('');

  const goldValue = (goldWeight && goldRate && goldPurity) ? (parseFloat(goldWeight) * (parseFloat(goldPurity) / 100) * parseFloat(goldRate)).toFixed(2) : '';
  const silverValue = (silverWeight && silverRate && silverPurity) ? (parseFloat(silverWeight) * (parseFloat(silverPurity) / 100) * parseFloat(silverRate)).toFixed(2) : '';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [confirmingPhotoDeleteIndex, setConfirmingPhotoDeleteIndex] = useState(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, { credentials: 'include' })
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
        const customerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, {
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

      if ((goldWeight || goldRate || goldValue) && !goldPurity) {
        setError('Gold purity % is required');
        setSubmitting(false);
        return;
      }
      if ((silverWeight || silverRate || silverValue) && !silverPurity) {
        setError('Silver purity % is required');
        setSubmitting(false);
        return;
      }

      const loanFormData = new FormData();
      loanFormData.append('customer_id', customerId);
      loanFormData.append('original_principal', principal);
      loanFormData.append('interest_rate', rate);
      loanFormData.append('loan_date', loanDate);
      if (!dueDate) {
        setError('Due date is required');
        setSubmitting(false);
        return;
      }
      loanFormData.append('due_date', dueDate);
      loanFormData.append('notes', notes);
      if (goldWeight) loanFormData.append('gold_weight', goldWeight);
      if (goldPurity) loanFormData.append('gold_purity', goldPurity);
      if (goldRate) loanFormData.append('gold_rate', goldRate);
      if (goldValue) loanFormData.append('gold_value', goldValue);
      if (silverWeight) loanFormData.append('silver_weight', silverWeight);
      if (silverPurity) loanFormData.append('silver_purity', silverPurity);
      if (silverRate) loanFormData.append('silver_rate', silverRate);
      if (silverValue) loanFormData.append('silver_value', silverValue);
      photos.forEach(file => loanFormData.append('photos', file));

      const loanRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loans`, {
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
            + Create new customer &quot;{search}&quot;
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
          <label className="text-sm text-[#57534E] block mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div className="border border-[#E7E5E4] rounded-lg p-4 bg-[#FAF9F6]">
          <h3 className="text-sm font-semibold text-[#292524] mb-3">Gold Details (Optional)</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-[#57534E] block mb-1">Weight (g)</label>
              <input
                type="number"
                value={goldWeight}
                onChange={(e) => setGoldWeight(e.target.value)}
                min="0"
                step="0.01"
                className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#57534E] block mb-1">Purity (%)</label>
              <input
                type="number"
                value={goldPurity}
                onChange={(e) => setGoldPurity(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#57534E] block mb-1">Rate (/g)</label>
              <input
                type="number"
                value={goldRate}
                onChange={(e) => setGoldRate(e.target.value)}
                min="0"
                step="0.01"
                className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#57534E] block mb-1">Calculated Value</label>
            <div className="w-full border border-[#E7E5E4] bg-[#F5F5F4] text-[#78716C] px-3 py-2 rounded-lg text-sm font-medium h-9 flex items-center">
              {goldValue ? `₹${goldValue}` : '—'}
            </div>
          </div>
        </div>

        <div className="border border-[#E7E5E4] rounded-lg p-4 bg-[#FAF9F6]">
          <h3 className="text-sm font-semibold text-[#292524] mb-3">Silver Details (Optional)</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-[#57534E] block mb-1">Weight (g)</label>
              <input
                type="number"
                value={silverWeight}
                onChange={(e) => setSilverWeight(e.target.value)}
                min="0"
                step="0.01"
                className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#57534E] block mb-1">Purity (%)</label>
              <input
                type="number"
                value={silverPurity}
                onChange={(e) => setSilverPurity(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#57534E] block mb-1">Rate (/g)</label>
              <input
                type="number"
                value={silverRate}
                onChange={(e) => setSilverRate(e.target.value)}
                min="0"
                step="0.01"
                className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#57534E] block mb-1">Calculated Value</label>
            <div className="w-full border border-[#E7E5E4] bg-[#F5F5F4] text-[#78716C] px-3 py-2 rounded-lg text-sm font-medium h-9 flex items-center">
              {silverValue ? `₹${silverValue}` : '—'}
            </div>
          </div>
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
                    onClick={() => setLightboxPhoto(URL.createObjectURL(file))}
                    className="w-16 h-16 rounded-lg object-cover border border-[#E7E5E4] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmingPhotoDeleteIndex(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-[#E7E5E4] rounded-full text-xs text-[#78716C] flex items-center justify-center hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {confirmingPhotoDeleteIndex !== null && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 w-full">
              <p className="text-red-800 mb-2 text-sm">
                Remove this photo?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhotos(prev => prev.filter((_, idx) => idx !== confirmingPhotoDeleteIndex));
                    setConfirmingPhotoDeleteIndex(null);
                  }}
                  className="bg-red-700 text-white text-xs px-3 py-1.5 rounded"
                >
                  Yes, remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingPhotoDeleteIndex(null)}
                  className="border border-red-200 text-red-800 text-xs px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-700 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#A16207] hover:bg-[#854D0E] text-white px-4 py-2 rounded-lg font-medium mt-2 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Create loan'}
        </button>
      </form>

      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img src={lightboxPhoto} className="max-w-full max-h-[90vh] object-contain rounded-lg" alt="Enlarged view" />
            <button 
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-4 -right-4 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center text-xl hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}