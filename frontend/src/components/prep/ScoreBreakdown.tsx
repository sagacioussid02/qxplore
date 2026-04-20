import { motion } from 'framer-motion';
import type { ScoringResult } from '../../types/challenge';

interface Props {
  result: ScoringResult;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color }}>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ result }: Props) {
  const passed = result.passed;
  return (
    <div className="card-quantum p-5 space-y-4">
      {/* Total */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="text-5xl font-mono font-bold mb-1"
          style={{ color: passed ? '#22c55e' : '#f97316' }}
        >
          {result.score}
        </motion.div>
        <p className="text-xs font-mono text-gray-400">Total Score</p>
        <span
          className="inline-block mt-1 text-xs font-mono px-3 py-0.5 rounded-full border"
          style={
            passed
              ? { color: '#22c55e', borderColor: '#22c55e60', background: '#22c55e15' }
              : { color: '#f97316', borderColor: '#f9731660', background: '#f9731615' }
          }
        >
          {passed ? '✓ Passed' : '✗ Failed'}
        </span>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-3">
        <Bar label="Correctness (60%)" value={result.correctness} color="#00ffff" />
        <Bar label="Efficiency (30%)" value={result.efficiency} color="#8b5cf6" />
        <Bar label="Speed (10%)" value={result.speed_score} color="#eab308" />
      </div>

      {/* Detail */}
      <div className="text-xs font-mono text-gray-500 space-y-0.5">
        <p>Fidelity: {(result.fidelity * 100).toFixed(2)}%</p>
        <p>Gates used: {result.gate_count}</p>
      </div>
    </div>
  );
}
