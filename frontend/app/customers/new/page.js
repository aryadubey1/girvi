'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCustomer() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (phone && !/^\d{10}$/.test(phone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('address', address);
    if (photo) formData.append('photo', photo);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to add customer');
      const customer = await res.json();
      router.push(`/customers/${customer.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-md">
      <Link href="/" className="text-sm text-[#A16207] hover:underline">
        &larr; Back to customers
      </Link>
      <h1 className="text-xl font-semibold text-[#292524] mt-2 mb-4">Add customer</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-sm text-[#57534E] block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm text-[#57534E] block mb-1">Photo</label>
          <div className="flex gap-2">
            <label className="flex-1 text-center border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#292524] cursor-pointer hover:border-[#D6D3D1]">
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="hidden"
              />
            </label>
            <label className="flex-1 text-center border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#292524] cursor-pointer hover:border-[#D6D3D1]">
              Choose from gallery
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>
          {photo && (
            <p className="text-xs text-[#78716C] mt-1">Selected: {photo.name}</p>
          )}
        </div>

        {error && <p className="text-red-700 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-[#A16207] hover:bg-[#854D0E] text-white px-4 py-2 rounded-lg font-medium mt-2 disabled:opacity-50"
        >
          {submitting ? 'Adding...' : 'Add customer'}
        </button>
      </form>
    </div>
  );
}