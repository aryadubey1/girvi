'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();

    if (res.ok) {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(data.error || 'Failed to change password');
    }
  }

  return (
    <div className="flex items-center justify-center py-24 px-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <h1 className="text-xl font-bold text-[#292524] mb-2">Change password</h1>

        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
        />

        <button
          type="submit"
          className="bg-[#A16207] hover:bg-[#854D0E] text-white px-3 py-2 rounded-lg font-semibold"
        >
          Update password
        </button>

        {error && <p className="text-red-700 text-sm">{error}</p>}
        {success && <p className="text-green-700 text-sm">Password updated successfully.</p>}

        <Link href="/" className="text-sm text-[#78716C] text-center mt-2 hover:underline">
          Back to dashboard
        </Link>
      </form>
    </div>
  );
}