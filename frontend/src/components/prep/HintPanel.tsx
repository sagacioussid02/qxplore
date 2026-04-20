import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  hints: string[];
  locked: boolean;
}

export function HintPanel({ hints, locked }: Props) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);

  if (locked) {
    return (
      <div className="card-quantum p-4 border-dashed opacity-60 text-center">
        <p className="text-xs font-mono text-gray-500">
          🔒 Hints unlock with Prep subscription
        </p>
      </div>
    );
  }

  return (
    <div className="card-quantum p-4">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-mono text-quantum-cyan">
          💡 Hints ({hints.length})
        </span>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {hints.slice(0, revealed + 1).map((hint, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-gray-400 font-mono border-l-2 border-quantum-cyan pl-3"
                >
                  <span className="text-quantum-cyan">#{i + 1}</span> {hint}
                </motion.p>
              ))}
              {revealed < hints.length - 1 && (
                <button
                  className="text-xs font-mono text-gray-600 hover:text-quantum-cyan transition-colors"
                  onClick={() => setRevealed(r => r + 1)}
                >
                  Show next hint →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
