import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/client';

interface Payment {
  id: string;
  amount: number;      // cents
  currency: string;
  created: number;     // unix timestamp
  credits_added: number;
}

export default function AccountPage() {
  const { user, credits, isAuthenticated, accessToken, startStripeCheckout } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoadingPayments(true);
    apiClient
      .get('/stripe/payments', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => setPayments(r.data.payments ?? []))
      .catch(() => setPayments([]))
      .finally(() => setLoadingPayments(false));
  }, [accessToken]);

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center text-gray-500">
        <p className="text-lg">Sign in to view your account.</p>
      </div>
    );
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-1">My Account</h1>
        <p className="text-gray-500 text-sm">Manage your profile and credits</p>
      </motion.div>

      {/* Profile card */}
      <motion.div
        className="card-quantum p-5 space-y-4"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      >
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <p className="text-sm text-white font-mono">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Member since</p>
            <p className="text-sm text-white font-mono">{memberSince}</p>
          </div>
        </div>
      </motion.div>

      {/* Credits card */}
      <motion.div
        className="card-quantum p-5 space-y-3"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Credits</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl text-quantum-amber">⚛</span>
            <div>
              <p className="text-2xl font-mono font-bold text-quantum-amber">
                {credits === null ? '…' : credits.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">credits remaining</p>
            </div>
          </div>
          <button
            onClick={startStripeCheckout}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors"
          >
            ✦ Buy 5,000 credits — $7
          </button>
        </div>

        <div className="border-t border-gray-700/40 pt-3 grid grid-cols-3 gap-3 text-center">
          {[
            { game: 'Bracket', cost: 450, icon: '🏀' },
            { game: 'Quantum TTT', cost: 45, icon: '⊗' },
            { game: 'Coin Flip', cost: 10, icon: '🪙' },
          ].map(({ game, cost, icon }) => (
            <div key={game} className="bg-gray-800/40 rounded-lg p-3">
              <p className="text-lg mb-1">{icon}</p>
              <p className="text-xs text-gray-400">{game}</p>
              <p className="text-sm font-mono text-quantum-amber mt-1">⚛ {cost}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Payment history */}
      <motion.div
        className="card-quantum p-5 space-y-3"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      >
        <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Payment History</h2>

        {loadingPayments ? (
          <p className="text-sm text-gray-500 py-4 text-center font-mono">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2.5 bg-gray-800/40 rounded-lg"
              >
                <div>
                  <p className="text-sm text-white font-mono">
                    +{p.credits_added.toLocaleString()} credits
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(p.created * 1000).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-400">
                    ${((p.amount ?? 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 uppercase">{p.currency}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
