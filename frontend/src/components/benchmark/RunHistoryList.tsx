import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BenchmarkRunSummary } from '../../types/benchmark';

const TEMPLATE_ICON: Record<string, string> = {
  grover: '🔍', rng: '🎲', shor: '🔢', qft: '〰', qaoa: '⚡', freeform: '⊕',
};

interface Props {
  runs: BenchmarkRunSummary[];
  onDelete?: (id: string) => void;
}

export function RunHistoryList({ runs, onDelete }: Props) {
  if (runs.length === 0) {
    return <p className="text-xs font-mono text-gray-600 text-center py-4">No runs yet.</p>;
  }

  return (
    <div className="space-y-2">
      {runs.slice(0, 10).map((run, i) => (
        <motion.div
          key={run.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors group"
        >
          <span className="text-lg">{TEMPLATE_ICON[run.template] ?? '⚛'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-gray-300 capitalize">{run.template}</p>
            <p className="text-xs font-mono text-gray-600 truncate">
              {new Date(run.created_at).toLocaleDateString()}
            </p>
          </div>
          {run.speedup_factor != null && (
            <span className="text-xs font-mono text-quantum-cyan shrink-0">
              {run.speedup_factor}×
            </span>
          )}
          <Link
            to={`/benchmark/run/${run.id}`}
            className="text-xs font-mono text-gray-600 hover:text-quantum-cyan transition-colors shrink-0"
          >
            View →
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(run.id)}
              className="text-xs font-mono text-gray-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
