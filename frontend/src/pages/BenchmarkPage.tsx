import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTemplates, useBenchmark, useRunHistory } from '../hooks/useBenchmark';
import { RunHistoryList } from '../components/benchmark/RunHistoryList';
import { useAuth } from '../hooks/useAuth';
import type { TemplateName, TemplateInfo, TemplateParameter } from '../types/benchmark';

const TEMPLATE_ICON: Record<string, string> = {
  grover: '🔍', rng: '🎲', shor: '🔢', qft: '〰', qaoa: '⚡', freeform: '⊕',
};
const TEMPLATE_COLOR: Record<string, string> = {
  grover: '#00ffff', rng: '#22c55e', shor: '#ec4899', qft: '#8b5cf6', qaoa: '#f97316', freeform: '#eab308',
};

function ParameterInput({
  param,
  value,
  onChange,
}: {
  param: TemplateParameter;
  value: number;
  onChange: (v: number) => void;
}) {
  if (param.type !== 'int') return null;
  return (
    <div className="space-y-1">
      <label className="text-xs font-mono text-gray-400">
        {param.label}
        {param.note && <span className="text-gray-600 ml-1">({param.note})</span>}
      </label>
      <input
        type="number"
        min={param.min}
        max={param.max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:border-quantum-cyan outline-none"
      />
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = TEMPLATE_COLOR[template.name] ?? '#00ffff';
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 rounded-xl border transition-all"
      style={{
        borderColor: selected ? color : 'rgba(255,255,255,0.08)',
        background: selected ? `${color}10` : 'transparent',
        boxShadow: selected ? `0 0 16px ${color}22` : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{TEMPLATE_ICON[template.name]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-bold text-sm" style={{ color }}>{template.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{template.tagline}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{ color: '#00ffff', borderColor: '#00ffff30', background: '#00ffff08' }}>
              {template.complexity_quantum}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{ color: '#8b5cf6', borderColor: '#8b5cf630', background: '#8b5cf608' }}>
              {template.complexity_classical}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function BenchmarkPage() {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useAuth();
  const { templates, loading: tLoading } = useTemplates();
  const { run, running, error } = useBenchmark(accessToken);
  const { runs, remove } = useRunHistory(accessToken);

  const [selected, setSelected] = useState<TemplateName>('grover');
  const [params, setParams] = useState<Record<string, number>>({});

  const selectedTemplate = templates.find(t => t.name === selected);

  const getParam = (name: string, def: number) => params[name] ?? def;
  const setParam = (name: string, v: number) => setParams(prev => ({ ...prev, [name]: v }));

  const handleRun = async () => {
    if (!selectedTemplate) return;
    const parameters: Record<string, unknown> = {};
    for (const p of selectedTemplate.parameters) {
      if (p.type === 'int') parameters[p.name] = getParam(p.name, p.default ?? 4);
    }
    const result = await run(selected, parameters);
    if (result?.id) {
      navigate(`/benchmark/run/${result.id}`);
    } else if (result) {
      // anonymous run — pass result via state
      navigate('/benchmark/run/preview', { state: { result } });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-mono font-bold text-quantum-cyan">⚡ Benchmarking</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Run a quantum algorithm side-by-side with its classical equivalent. See circuit stats, step counts, and theoretical speedup.
        </p>
      </motion.div>

      {/* Free tier note */}
      <div className="card-quantum p-4 border-l-2 border-quantum-purple text-sm text-gray-400 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-quantum-purple font-mono font-bold">Free tier</span>
          {' '}— 3 runs/month · no history saved.{' '}
          <span className="text-gray-300">Pro ($99/mo)</span> unlocks unlimited runs + PDF export.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template selector */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Choose a template</p>
          {tLoading ? (
            <p className="text-gray-600 font-mono text-sm animate-pulse">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map(t => (
                <TemplateCard
                  key={t.name}
                  template={t}
                  selected={selected === t.name}
                  onSelect={() => setSelected(t.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Parameters + run */}
        <div className="space-y-4">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Parameters</p>
          <div className="card-quantum p-4 space-y-4">
            {selectedTemplate?.parameters
              .filter(p => p.type === 'int')
              .map(p => (
                <ParameterInput
                  key={p.name}
                  param={p}
                  value={getParam(p.name, p.default ?? 4)}
                  onChange={v => setParam(p.name, v)}
                />
              ))
            }
            {selectedTemplate?.parameters.filter(p => p.type === 'int').length === 0 && (
              <p className="text-xs font-mono text-gray-600">No parameters — fixed configuration.</p>
            )}

            <button
              onClick={handleRun}
              disabled={running || !selectedTemplate}
              className="w-full btn-cyan disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚛</span> Running Qiskit…
                </span>
              ) : 'Run Benchmark →'}
            </button>

            {!isAuthenticated && (
              <p className="text-xs font-mono text-gray-600 text-center">
                Results won't be saved without an account.
              </p>
            )}

            {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
          </div>
        </div>
      </div>

      {/* Run history */}
      {isAuthenticated && runs.length > 0 && (
        <div>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">Recent Runs</p>
          <RunHistoryList runs={runs} onDelete={remove} />
        </div>
      )}
    </div>
  );
}
