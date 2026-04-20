import type { QuantumMetrics } from '../../types/benchmark';

interface Props { metrics: QuantumMetrics; }

function Stat({ label, value, color = '#00ffff' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-mono font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-500 font-mono mt-0.5">{label}</p>
    </div>
  );
}

export function CircuitStats({ metrics }: Props) {
  const gateTotal = typeof metrics.gate_count === 'number'
    ? metrics.gate_count
    : Object.values(metrics.gate_count).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Depth" value={metrics.circuit_depth} />
      <Stat label="Gates" value={gateTotal} />
      <Stat label="CNOTs" value={metrics.cnot_count} color="#f97316" />
      <Stat label="Qubits" value={metrics.qubit_count} color="#8b5cf6" />
      <Stat label="Sim time" value={`${metrics.sim_time_ms}ms`} color="#eab308" />
      <Stat label="Shots" value={metrics.shots} color="#6b7280" />
    </div>
  );
}
