import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useTemplates } from '../hooks/useBenchmark';
import { fetchRun } from '../api/benchmarkApi';
import { CircuitStats } from '../components/benchmark/CircuitStats';
import { MetricsTable } from '../components/benchmark/MetricsTable';
import { SpeedupChart } from '../components/benchmark/SpeedupChart';
import { ComplexityBadge } from '../components/benchmark/ComplexityBadge';
import type { BenchmarkResult } from '../types/benchmark';

function ScalingTable({ template, n }: { template: string; n: number }) {
  if (template !== 'grover' || n < 4) return null;
  const rows = [16, 256, 65536, 1048576].map(size => ({
    n: size,
    classical: size,
    quantum: Math.round(Math.PI / 4 * Math.sqrt(size)),
  }));
  return (
    <div className="card-quantum p-4">
      <p className="text-xs font-mono text-gray-400 mb-3">Theoretical Scaling</p>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-gray-800 text-gray-600">
            <th className="text-left pb-2">N (items)</th>
            <th className="text-right pb-2 text-quantum-purple">Classical steps</th>
            <th className="text-right pb-2 text-quantum-cyan">Quantum steps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.n} className="border-b border-gray-800/40"
              style={r.n === n ? { background: 'rgba(0,255,255,0.05)' } : undefined}>
              <td className="py-1.5 text-gray-400">{r.n.toLocaleString()}{r.n === n ? ' ← you' : ''}</td>
              <td className="py-1.5 text-right text-quantum-purple">{r.classical.toLocaleString()}</td>
              <td className="py-1.5 text-right text-quantum-cyan">{r.quantum}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BenchmarkRunPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { accessToken } = useAuth();
  const { templates } = useTemplates();

  const [result, setResult] = useState<BenchmarkResult | null>(
    (location.state as { result?: BenchmarkResult })?.result ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const needsFetch = !result && id !== 'preview' && !!id && !!accessToken;
  const notFound = id !== 'preview' && (!id || !accessToken);

  useEffect(() => {
    if (!needsFetch) return;
    fetchRun(id, accessToken)
      .then(setResult)
      .catch(e => setError(e.message));
  }, [needsFetch, id, accessToken]);

  if (notFound) return <p className="font-mono text-red-400">Error: Not found</p>;
  if (!result && !error) return <p className="font-mono text-gray-500 animate-pulse">Loading run…</p>;
  if (error || !result) return <p className="font-mono text-red-400">Error: {error ?? 'Run not found'}</p>;

  const templateInfo = templates.find(t => t.name === result.template);
  const title = templateInfo?.title ?? result.template;
  const qComplexity = templateInfo?.complexity_quantum ?? '—';
  const cComplexity = templateInfo?.complexity_classical ?? '—';
  const n = Number(result.parameters?.n_items ?? result.parameters?.n_qubits ?? result.parameters?.n_nodes ?? 0);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
        <Link to="/benchmark" className="hover:text-quantum-cyan transition-colors">Benchmark</Link>
        <span>/</span>
        <span className="text-gray-400">{title}</span>
      </div>

      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-mono font-bold text-quantum-cyan">
          {title}
        </h1>
        <p className="text-xs font-mono text-gray-500 mt-1">
          {Object.entries(result.parameters)
            .filter(([, v]) => typeof v === 'number')
            .map(([k, v]) => `${k}=${v}`)
            .join(' · ')}
          {result.created_at && ` · ${new Date(result.created_at).toLocaleString()}`}
        </p>
      </motion.div>

      {/* Speedup + complexity */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-quantum p-6 space-y-4"
      >
        <p className="text-xs font-mono text-gray-500 text-center uppercase tracking-wider">Complexity Comparison</p>
        <ComplexityBadge quantum={qComplexity} classical={cComplexity} />
        {result.classical && (
          <SpeedupChart
            quantum={result.quantum}
            classical={result.classical}
            speedupFactor={result.speedup_factor}
          />
        )}
      </motion.div>

      {/* Two-panel metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quantum panel */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card-quantum p-5"
          style={{ borderColor: 'rgba(0,255,255,0.2)' }}
        >
          <p className="text-xs font-mono text-quantum-cyan uppercase tracking-wider mb-4">
            ⚛ Quantum Circuit — AerSimulator (noiseless)
          </p>
          <CircuitStats metrics={result.quantum} />
        </motion.div>

        {/* Classical panel */}
        {result.classical ? (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="card-quantum p-5"
            style={{ borderColor: 'rgba(139,92,246,0.2)' }}
          >
            <p className="text-xs font-mono text-quantum-purple uppercase tracking-wider mb-4">
              💻 Classical — {result.classical.algorithm}
            </p>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Steps</span>
                <span className="text-white">{result.classical.steps.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="text-white">{result.classical.time_ms}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Complexity</span>
                <span className="text-quantum-purple">{result.classical.complexity_label}</span>
              </div>
              {Object.entries(result.classical.result)
                .filter(([k]) => !['note'].includes(k))
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-gray-300">{String(v)}</span>
                  </div>
                ))}
            </div>
          </motion.div>
        ) : (
          <div className="card-quantum p-5 opacity-40 flex items-center justify-center">
            <p className="text-xs font-mono text-gray-600">No classical comparison for free-form circuits.</p>
          </div>
        )}
      </div>

      {/* Full metrics table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-quantum p-5"
      >
        <p className="text-xs font-mono text-gray-400 mb-4">Full Metrics Comparison</p>
        <MetricsTable quantum={result.quantum} classical={result.classical} />
      </motion.div>

      {/* Scaling table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <ScalingTable template={result.template} n={n} />
      </motion.div>

      {/* Simulator note */}
      <p className="text-xs font-mono text-gray-700 text-center">
        All quantum results from <span className="text-gray-500">AerSimulator (noiseless)</span>.
        Real hardware adds noise and decoherence — classical algorithms remain faster at current error rates
        for most problem sizes.
      </p>

      <Link to="/benchmark" className="inline-block btn-outline text-sm">← New Benchmark</Link>
    </div>
  );
}
