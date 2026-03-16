import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
  credits: number | null;
  onSignOut: () => void;
  onBuyCredits: () => void;
}

export function UserMenu({ user, credits, onSignOut, onBuyCredits }: Props) {
  const [open, setOpen] = useState(false);
  const initial = (user.email ?? 'U')[0].toUpperCase();
  const outOfCredits = credits !== null && credits <= 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
          {initial}
        </div>

        {/* Credits badge */}
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
          outOfCredits
            ? 'bg-red-900/40 text-red-400'
            : 'bg-green-900/40 text-green-400'
        }`}>
          {credits === null ? '…' : `${credits} cr`}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute right-0 top-10 z-40 w-52 bg-[#0f1525] border border-gray-700/60 rounded-xl shadow-2xl p-2"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            >
              <div className="px-3 py-2 border-b border-gray-700/40 mb-1">
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {credits === null ? '…' : credits} credit{credits !== 1 ? 's' : ''} remaining
                </p>
              </div>

              {outOfCredits && (
                <button
                  onClick={() => { onBuyCredits(); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-300 hover:bg-indigo-900/30 transition-colors font-medium"
                >
                  ✦ Buy more credits
                </button>
              )}

              {!outOfCredits && (
                <button
                  onClick={() => { onBuyCredits(); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/40 transition-colors"
                >
                  Buy more credits
                </button>
              )}

              <button
                onClick={() => { onSignOut(); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800/40 transition-colors"
              >
                Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
