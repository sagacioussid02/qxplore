import type { QuantumMetrics, ClassicalMetrics } from '../../types/benchmark';

interface Props {
  quantum: QuantumMetrics;
  classical: ClassicalMetrics | null;
}

function Row({ label, quantum, classical }: { label: string; quantum: string; classical: string }) {
  return (
    <tr className="border-b border-gray-800/60">
      <td className="py-2 text-xs font-mono text-gray-500 pr-4">{label}</td>
      <td className="py-2 text-xs font-mono text-quantum-cyan text-right">{quantum}</td>
      <td className="py-2 text-xs font-mono text-quantum-purple text-right">{classical}</td>
    </tr>
  );
}

export function MetricsTable({ quantum, classical }: Props) {
  const gateTotal = typeof quantum.gate_count === 'number'
    ? quantum.gate_count
    : Object.values(quantum.gate_count).reduce((a, b) => a + b, 0);

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-700">
          <th className="text-left pb-2 text-xs font-mono text-gray-600">Metric</th>
          <th className="text-right pb-2 text-xs font-mono text-quantum-cyan">Quantum</th>
          <th className="text-right pb-2 text-xs font-mono text-quantum-purple">Classical</th>
        </tr>
      </thead>
      <tbody>
        <Row label="Algorithm" quantum={`${quantum.qubit_count}-qubit circuit`} classical={classical?.algorithm ?? '—'} />
        <Row label="Steps / Gates" quantum={String(gateTotal)} classical={classical ? String(classical.steps) : '—'} />
        <Row label="Time" quantum={`${quantum.sim_time_ms}ms`} classical={classical ? `${classical.time_ms}ms` : '—'} />
        <Row label="Complexity" quantum="See badge" classical={classical?.complexity_label ?? '—'} />
        <Row label="Circuit depth" quantum={String(quantum.circuit_depth)} classical="—" />
        <Row label="CNOTs" quantum={String(quantum.cnot_count)} classical="—" />
        <Row label="Qubits" quantum={String(quantum.qubit_count)} classical="—" />
      </tbody>
    </table>
  );
}
