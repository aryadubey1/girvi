'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingLoanDelete, setConfirmingLoanDelete] = useState(null);
  const [loanDeleteError, setLoanDeleteError] = useState('');
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load customer');
        return res.json();
      })
      .then(data => {
        setCustomer(data);
        setEditName(data.name || '');
        setEditPhone(data.phone || '');
        setEditAddress(data.address || '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  async function handleSaveEdit() {
    setEditError('');
    if (editPhone && !/^\d{10}$/.test(editPhone)) {
      setEditError('Phone number must be exactly 10 digits');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName, phone: editPhone, address: editAddress }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update customer');
      }
      const updated = await res.json();
      setCustomer(prev => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function handleAddPhotos(loanId, files) {
    setPhotoError('');
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('photos', file));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loans/${loanId}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to add photos');
      const newPhotos = await res.json();

      setCustomer(prev => ({
        ...prev,
        loans: prev.loans.map(l =>
          l.id === loanId ? { ...l, photos: [...l.photos, ...newPhotos] } : l
        ),
      }));
    } catch (err) {
      setPhotoError(err.message);
    }
  }

  async function handleDeletePhoto(loanId, photoId) {
    setPhotoError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/loans/${loanId}/photos/${photoId}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to delete photo');

      setCustomer(prev => ({
        ...prev,
        loans: prev.loans.map(l =>
          l.id === loanId
            ? { ...l, photos: l.photos.filter(p => p.id !== photoId) }
            : l
        ),
      }));
    } catch (err) {
      setPhotoError(err.message);
    }
  }

  async function handleDeleteLoan(loanId) {
    setLoanDeleteError('');
    try {
      const res = await fetch(`http://localhost:3001/api/loans/${loanId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete loan');
      }
      setCustomer(prev => ({
        ...prev,
        loans: prev.loans.filter(l => l.id !== loanId),
      }));
      setConfirmingLoanDelete(null);
    } catch (err) {
      setLoanDeleteError(err.message);
    }
  }

  async function handleDelete() {
    setDeleteError('');
    try {
      const res = await fetch(`http://localhost:3001/api/customers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete customer');
      }
      router.push('/');
    } catch (err) {
      setDeleteError(err.message);
    }
    setConfirmingDelete(false);
  }

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] p-6 text-[#78716C]">Loading...</div>;
  if (error) return <div className="min-h-screen bg-[#FAF9F6] p-6 text-red-700">{error}</div>;

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="border-b border-[#E7E5E4] px-6 py-5">
        <Link href="/" className="text-sm text-[#A16207] hover:underline">
          &larr; Back to customers
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {customer.photo_path ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}/${customer.photo_path.replace(/\\/g, '/')}`}
                alt={customer.name}
                className="w-16 h-16 rounded-full object-cover border border-[#E7E5E4]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#F0EDE6] border border-[#E7E5E4] flex items-center justify-center text-[#A8A29E]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
            )}

            {!editing ? (
              <div>
                <h1 className="text-2xl font-semibold text-[#292524]">{customer.name}</h1>
                <p className="text-sm text-[#78716C] mt-0.5">{customer.phone}</p>
                <p className="text-sm text-[#78716C]">{customer.address}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Address"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                {editError && <p className="text-red-700 text-xs">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="bg-[#A16207] text-white text-xs px-3 py-1 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="border border-[#E7E5E4] text-[#292524] text-xs px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {!editing && (
            <div className="flex gap-2 text-sm">
              <button onClick={() => setEditing(true)} className="text-[#A16207] hover:underline">
                Edit
              </button>
              <button onClick={() => setConfirmingDelete(true)} className="text-red-700 hover:underline">
                Delete
              </button>
            </div>
          )}
        </div>

        {confirmingDelete && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <p className="text-red-800 mb-2">
                Delete {customer.name} and all their loans, payments, and photos? This cannot be undone.
              </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="bg-red-700 text-white text-xs px-3 py-1.5 rounded"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="border border-red-200 text-red-800 text-xs px-3 py-1.5 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {deleteError && <p className="text-red-700 text-sm mt-2">{deleteError}</p>}
      </div>

      <div className="p-6 max-w-2xl">
        {customer.loans.length === 0 && (
          <p className="text-[#78716C]">No amount due right now.</p>
        )}

        {customer.loans.map(loan => {
          const isExpanded = expandedLoanId === loan.id;
          return (
            <div
              key={loan.id}
              className="bg-white border border-[#E7E5E4] rounded-xl p-5 mb-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[#78716C]">Amount due today</p>
                  <p className="text-3xl font-semibold text-[#A16207] mt-1">
                    ₹{loan.total_owed}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                  className="text-sm text-[#A16207] hover:underline mt-1"
                >
                  {isExpanded ? 'Hide details' : 'View details'}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#E7E5E4] text-sm text-[#44403C] space-y-1.5">
                  <p>Loan disbursed: {loan.loan_date}</p>
                  <p>Loan amount remaining: ₹{loan.outstanding_principal}</p>
                  <p>
                    Interest due: ₹
                    {(Number(loan.interest_shortfall) + Number(loan.interest_accrued_today)).toFixed(2)}
                  </p>
                  <p>Interest rate: {loan.interest_rate}% per month</p>
                  {loan.notes && <p>Notes: {loan.notes}</p>}

                  <div className="flex gap-2 flex-wrap mt-2 mb-1">
                    {loan.photos.map(p => (
                      <div key={p.id} className="relative w-16 h-16">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}/${p.photo_path.replace(/\\/g, '/')}`}
                          alt="Jewellery"
                          className="w-16 h-16 rounded-lg object-cover border border-[#E7E5E4]"
                        />
                        <button
                          onClick={() => handleDeletePhoto(loan.id, p.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-[#E7E5E4] rounded-full text-xs text-[#78716C] flex items-center justify-center hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border border-dashed border-[#D6D3D1] flex items-center justify-center text-[#A16207] text-xl cursor-pointer hover:border-[#A16207]">
                      +
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleAddPhotos(loan.id, e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {photoError && <p className="text-red-700 text-xs mb-2">{photoError}</p>}

                  <h3 className="mt-4 font-semibold text-[#292524]">Payment history</h3>
                  {loan.payments.length === 0 && (
                    <p className="text-[#78716C]">No payments yet.</p>
                  )}
                  {loan.payments.map(p => (
                    <p key={p.id} className="text-[#57534E]">
                      {p.payment_date}: ₹{p.amount_paid} paid
                    </p>
                  ))}

                  <button
                    onClick={() => setConfirmingLoanDelete(loan.id)}
                    className="text-red-700 text-xs hover:underline mt-2"
                  >
                    Delete this loan
                  </button>

                  {confirmingLoanDelete === loan.id && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 mb-2">
                        Delete this loan and its payment history? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="bg-red-700 text-white text-xs px-3 py-1.5 rounded"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmingLoanDelete(null)}
                          className="border border-red-200 text-red-800 text-xs px-3 py-1.5 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}