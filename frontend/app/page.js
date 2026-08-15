'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [customers, setCustomers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [amountsVisible, setAmountsVisible] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/check-auth', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setLoggedIn(data.authenticated);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loggedIn) {
      fetch('http://localhost:3001/api/customers', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCustomers(data);
        });

      fetch('http://localhost:3001/api/dashboard', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setDashboard(data));
    }
  }, [loggedIn]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setLoggedIn(true);
    } else {
      setLoginError('Incorrect password');
    }
  }

  function formatAmount(n) {
    return amountsVisible ? `₹${Number(n).toLocaleString('en-IN')}` : '••••••';
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6 text-[#78716C]">Loading...</div>;

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center py-24 px-6">
        <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full max-w-xs">
          <h1 className="text-xl font-bold text-[#292524] mb-2">Log in</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="border border-[#E7E5E4] bg-white text-[#292524] px-3 py-2 rounded-lg"
          />
          <button
            type="submit"
            className="bg-[#A16207] hover:bg-[#854D0E] text-white px-3 py-2 rounded-lg font-semibold"
          >
            Log in
          </button>
          {loginError && <p className="text-red-700 text-sm">{loginError}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[#292524]">Dashboard</h2>
          <button
            onClick={() => setAmountsVisible(v => !v)}
            className="text-[#A8A29E] hover:text-[#A16207] transition-colors"
            aria-label="Toggle amount visibility"
          >
            {amountsVisible ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.1 3.9M6.1 6.1A13.4 13.4 0 0 0 2 12s3.5 7 10 7c1.2 0 2.3-.2 3.4-.6" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <Link
            href="/loans/new"
            className="bg-[#A16207] hover:bg-[#854D0E] text-white text-sm px-4 py-2 rounded-lg font-semibold shadow-sm"
          >
            + New loan
          </Link>
          <Link
            href="/customers/new"
            className="bg-white text-[#292524] text-sm px-4 py-2 rounded-lg font-semibold shadow-sm hover:shadow-md transition-shadow"
          >
            + Add customer
          </Link>
        </div>
      </div>

      {dashboard && (
        <div className="hidden md:grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#FDF3E3] flex items-center justify-center text-[#A16207] text-xs font-bold">
                ₹
              </div>
              <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide">
                Total out on loan
              </p>
            </div>
            <p className="text-2xl font-bold text-[#A16207] mt-1">
              {formatAmount(dashboard.total_out)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#047857] text-xs font-bold">
                ✓
              </div>
              <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide">
                Collected this month
              </p>
            </div>
            <p className="text-2xl font-bold text-[#292524] mt-1">
              {formatAmount(dashboard.collected_this_month)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#1D4ED8] text-xs font-bold">
                #
              </div>
              <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide">
                Customers with balance
              </p>
            </div>
            <p className="text-2xl font-bold text-[#292524] mt-1">
              {dashboard.active_customers}
            </p>
          </div>
        </div>
      )}

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#78716C] uppercase tracking-wide">
              Customers ({customers.length})
            </h3>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full bg-white text-[#292524] px-3 py-2.5 rounded-lg mb-3 text-sm shadow-sm border-0 focus:ring-2 focus:ring-[#A16207] outline-none"
          />

          {filteredCustomers.map(c => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <div className="bg-white rounded-xl px-4 py-3.5 mb-3 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-semibold text-[#292524]">{c.name}</p>
                <p className="text-sm text-[#A16207] font-bold">
                  {formatAmount(c.current_balance || 0)}
                </p>
              </div>
            </Link>
          ))}

          {search && filteredCustomers.length === 0 && (
            <p className="text-sm text-[#78716C]">No customers match "{search}".</p>
          )}
        </div>

        {dashboard && (
          <div className="hidden md:block">
            <h3 className="text-xs font-bold text-[#78716C] uppercase tracking-wide mb-3">
              Top borrowers
            </h3>
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
              {dashboard.top_borrowers.length === 0 && (
                <p className="text-sm text-[#78716C]">No active loans yet.</p>
              )}
              {dashboard.top_borrowers.map((b, i) => (
                <Link key={b.id} href={`/customers/${b.id}`}>
                  <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE6] last:border-0 hover:opacity-70">
                    <span className="text-sm font-medium text-[#292524]">
                      {i + 1}. {b.name}
                    </span>
                    <span className="text-sm font-bold text-[#A16207]">
                      {formatAmount(b.total_owed)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <h3 className="text-xs font-bold text-[#78716C] uppercase tracking-wide mb-3">
              Recent payments
            </h3>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              {dashboard.recent_payments.length === 0 && (
                <p className="text-sm text-[#78716C]">No payments yet.</p>
              )}
              {dashboard.recent_payments.map(p => (
                <Link key={p.id} href={`/customers/${p.customer_id}`}>
                  <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE6] last:border-0 hover:opacity-70">
                    <div>
                      <p className="text-sm font-medium text-[#292524]">{p.customer_name}</p>
                      <p className="text-xs text-[#A8A29E]">{p.payment_date}</p>
                    </div>
                    <span className="text-sm font-bold text-[#292524]">
                      {formatAmount(p.amount_paid)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}