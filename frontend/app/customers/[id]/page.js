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
  const [editAadhar, setEditAadhar] = useState('');
  const [editPan, setEditPan] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingLoanDelete, setConfirmingLoanDelete] = useState(null);
  const [loanDeleteError, setLoanDeleteError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [newLoanPrincipal, setNewLoanPrincipal] = useState('');
  const [newLoanRate, setNewLoanRate] = useState('');
  const [newLoanDate, setNewLoanDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [newLoanNotes, setNewLoanNotes] = useState('');
  const [newLoanPhotos, setNewLoanPhotos] = useState(null);
  const [newLoanError, setNewLoanError] = useState('');
  const [newLoanSubmitting, setNewLoanSubmitting] = useState(false);
  const [payingLoanId, setPayingLoanId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [paymentError, setPaymentError] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

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
        setEditAadhar(data.aadhar_number || '');
        setEditPan(data.pan_number || '');
        setEditEmail(data.email || '');
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
    if (editAadhar && !/^\d{12}$/.test(editAadhar)) {
      setEditError('Aadhar number must be exactly 12 digits');
      return;
    }
    if (editPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(editPan)) {
      setEditError('PAN number must be in the format ABCDE1234F');
      return;
    }
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      setEditError('Email address is not valid');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          aadhar_number: editAadhar,
          pan_number: editPan,
          email: editEmail,
        }),
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loans/${loanId}`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, {
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

  async function handleAddLoan() {
    setNewLoanError('');
    if (!newLoanPrincipal || Number(newLoanPrincipal) <= 0) {
      setNewLoanError('Principal amount is required');
      return;
    }
    if (!newLoanRate || Number(newLoanRate) <= 0) {
      setNewLoanError('Interest rate is required');
      return;
    }
    if (!newLoanDate) {
      setNewLoanError('Loan date is required');
      return;
    }
    setNewLoanSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('customer_id', id);
      formData.append('original_principal', newLoanPrincipal);
      formData.append('interest_rate', newLoanRate);
      formData.append('loan_date', newLoanDate);
      formData.append('notes', newLoanNotes);
      if (newLoanPhotos) {
        Array.from(newLoanPhotos).forEach(file => formData.append('photos', file));
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/loans`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create loan');
      }
      const newLoan = await res.json();
      setCustomer(prev => ({
        ...prev,
        loans: [
          {
            ...newLoan,
            interest_shortfall: newLoan.interest_shortfall || '0',
            days_since_last_payment: 0,
            interest_accrued_today: 0,
            total_owed: parseFloat(newLoan.outstanding_principal),
            payments: [],
            photos: [],
          },
          ...prev.loans,
        ],
      }));
      setShowAddLoan(false);
      setNewLoanPrincipal('');
      setNewLoanRate('');
      setNewLoanDate(new Date().toLocaleDateString('en-CA'));
      setNewLoanNotes('');
      setNewLoanPhotos(null);
    } catch (err) {
      setNewLoanError(err.message);
    } finally {
      setNewLoanSubmitting(false);
    }
  }

  async function handleAddPayment(loanId) {
    setPaymentError('');
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setPaymentError('Payment amount is required');
      return;
    }
    if (!paymentDate) {
      setPaymentError('Payment date is required');
      return;
    }
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          loan_id: loanId,
          amount_paid: paymentAmount,
          payment_date: paymentDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      // paymentRoutes.js doesn't return the updated loan, just the payment row,
      // so refetch the customer to get fresh outstanding_principal / interest_shortfall / total_owed.
      const refreshed = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, {
        credentials: 'include',
      });
      if (!refreshed.ok) throw new Error('Payment saved, but failed to refresh customer data');
      const data = await refreshed.json();
      setCustomer(data);

      setPayingLoanId(null);
      setPaymentAmount('');
      setPaymentDate(new Date().toLocaleDateString('en-CA'));
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#FAF9F6] p-6 text-[#78716C]">Loading...</div>;
  if (error) return <div className="min-h-screen bg-[#FAF9F6] p-6 text-red-700">{error}</div>;

  function buildReminderLink() {
    const totalDue = customer.loans
      .reduce((sum, loan) => sum + Number(loan.total_owed), 0)
      .toFixed(2);
    const message = `Hi ${customer.name}, this is a reminder from Om Shivam Jewellers. Your total amount due is ₹${totalDue}. Please contact us at your earliest convenience.`;
    // sms: body param support varies by OS (Android generally uses ?body=, iOS uses ;body=
    // after a semicolon) — ?body= works as a reasonable default on most phones.
    return `sms:${customer.phone}?body=${encodeURIComponent(message)}`;
  }

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
                {customer.aadhar_number && (
                  <p className="text-sm text-[#78716C]">Aadhar: {customer.aadhar_number}</p>
                )}
                {customer.pan_number && (
                  <p className="text-sm text-[#78716C]">PAN: {customer.pan_number}</p>
                )}
                {customer.email && (
                  <p className="text-sm text-[#78716C]">{customer.email}</p>
                )}
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
                <input
                  type="text"
                  value={editAadhar}
                  onChange={(e) => setEditAadhar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Aadhar number (optional)"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <input
                  type="text"
                  value={editPan}
                  onChange={(e) => setEditPan(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="PAN number (optional)"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email (optional)"
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
            <div className="flex gap-2 text-sm items-center">
              {customer.phone && customer.loans.length > 0 && (
                <a
                  href={buildReminderLink()}
                  className="bg-[#A16207] text-white text-xs px-3 py-1.5 rounded hover:bg-[#854D0E]"
                >
                  Send Reminder
                </a>
              )}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}/pdf`}
                className="border border-[#A16207] text-[#A16207] text-xs px-3 py-1.5 rounded hover:bg-[#FEF3C7]"
              >
                Download Statement
              </a>
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
        <div className="mb-4">
          {!showAddLoan ? (
            <button
              onClick={() => setShowAddLoan(true)}
              className="bg-[#A16207] text-white text-sm px-4 py-2 rounded"
            >
              + Add Loan
            </button>
          ) : (
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-5">
              <h3 className="font-semibold text-[#292524] mb-3">New Loan</h3>
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  value={newLoanPrincipal}
                  onChange={(e) => setNewLoanPrincipal(e.target.value)}
                  placeholder="Principal amount (₹)"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newLoanRate}
                  onChange={(e) => setNewLoanRate(e.target.value)}
                  placeholder="Interest rate (% per month)"
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <input
                  type="date"
                  value={newLoanDate}
                  onChange={(e) => setNewLoanDate(e.target.value)}
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <textarea
                  value={newLoanNotes}
                  onChange={(e) => setNewLoanNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                />
                <label className="text-sm text-[#78716C]">
                  Photos (optional)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setNewLoanPhotos(e.target.files)}
                    className="block mt-1 text-sm"
                  />
                </label>
                {newLoanError && <p className="text-red-700 text-xs">{newLoanError}</p>}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleAddLoan}
                    disabled={newLoanSubmitting}
                    className="bg-[#A16207] text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {newLoanSubmitting ? 'Saving...' : 'Save Loan'}
                  </button>
                  <button
                    onClick={() => { setShowAddLoan(false); setNewLoanError(''); }}
                    className="border border-[#E7E5E4] text-[#292524] text-xs px-3 py-1.5 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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
                  <p>Interest rate: {loan.interest_rate}% per month</p>
                  {loan.notes && <p>Notes: {loan.notes}</p>}

                  <div className="overflow-x-auto mt-3 border border-[#E7E5E4] rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-[#F0EDE6] text-left text-[#78716C]">
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Event</th>
                          <th className="px-3 py-2 font-medium text-right">Principal Balance</th>
                          <th className="px-3 py-2 font-medium text-right">Interest Paid</th>
                          <th className="px-3 py-2 font-medium text-right">Interest Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loan.ledger.map((row, i) => (
                          <tr
                            key={i}
                            className={
                              row.isSummaryRow
                                ? 'bg-[#FEF3C7] font-semibold text-[#292524]'
                                : 'border-t border-[#E7E5E4]'
                            }
                          >
                            <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-2">{row.event}</td>
                            <td className="px-3 py-2 text-right">₹{row.principalBalance.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">
                              {row.interestPaid !== null ? `₹${row.interestPaid.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">₹{row.interestOwedAtRow.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

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

                  {payingLoanId !== loan.id ? (
                    <button
                      onClick={() => { setPayingLoanId(loan.id); setPaymentError(''); }}
                      className="bg-[#A16207] text-white text-xs px-3 py-1.5 rounded mt-2"
                    >
                      Record Payment
                    </button>
                  ) : (
                    <div className="mt-3 bg-[#FAF9F6] border border-[#E7E5E4] rounded-lg p-3">
                      <div className="flex flex-col gap-2">
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Amount paid (₹)"
                          className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                        />
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="border border-[#E7E5E4] bg-white text-[#292524] px-2 py-1 rounded text-sm"
                        />
                        {paymentError && <p className="text-red-700 text-xs">{paymentError}</p>}
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleAddPayment(loan.id)}
                            disabled={paymentSubmitting}
                            className="bg-[#A16207] text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                          >
                            {paymentSubmitting ? 'Saving...' : 'Save Payment'}
                          </button>
                          <button
                            onClick={() => { setPayingLoanId(null); setPaymentError(''); }}
                            className="border border-[#E7E5E4] text-[#292524] text-xs px-3 py-1.5 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setConfirmingLoanDelete(loan.id)}
                    className="text-red-700 text-xs hover:underline mt-2 block"
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