import { motion } from 'framer-motion';
import type { QuantumMetrics, ClassicalMetrics } from '../../types/benchmark';

interface Props {
  quantum: QuantumMetrics;
  classical: ClassicalMetrics;
  speedupFactor: number | null;
}

export function SpeedupChart({ quantum, classical, speedupFactor }: Props) {
  const classicalSteps = classical.steps;
  const qGateCount = typeof quantum.gate_count === 'number'
    ? quantum.gate_count
    : Object.values(quantum.gate_count).reduce((a, b) => a + b, 0);
  const maxSteps = Math.max(classicalSteps, qGateCount, 1);
  const qPct = Math.max(4, (qGateCount / maxSteps) * 100);
  const cPct = Math.max(4, (classicalSteps / maxSteps) * 100);

  return (
    <div className="space-y-4">
      {speedupFactor != null && (
        <div className="text-center">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="text-4xl font-mono font-bold text-quantum-cyan"
          >
            {speedupFactor}×
          </motion.p>
          <p className="text-xs font-mono text-gray-500 mt-1">theoretical speedup at this problem size</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-quantum-cyan">Quantum ({quantum.qubit_count} qubits)</span>
            <span className="text-gray-400">{qGateCount} gate ops</span>
          </div>
          <div className="h-6 rounded-full bg-gray-800 overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00ffff, #00ffff88)' }}
              initial={{ width: 0 }}
              animate={{ width: `${qPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-quantum-purple">Classical ({classical.algorithm})</span>
            <span className="text-gray-400">{classicalSteps} steps</span>
          </div>
          <div className="h-6 rounded-full bg-gray-800 overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #8b5cf6, #8b5cf688)' }}
              initial={{ width: 0 }}
              animate={{ width: `${cPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }} />
          </div>
        </div>
      </div>

      <div className="flex justify-between text-xs font-mono text-gray-600">
        <span>Sim time: {quantum.sim_time_ms}ms</span>
        <span>Classical: {classical.time_ms}ms</span>
      </div>
    </div>
  );
}
