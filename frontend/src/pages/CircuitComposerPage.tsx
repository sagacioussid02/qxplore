import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

type GateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'CNOT';

interface PlacedGate {
  id: string;
  type: GateType;
  qubit: number;
  step: number;
  target?: number; // CNOT only
}

interface CircuitResult {
  statevector: { real: number; imag: number }[];
  probabilities: Record<string, number>;
  bloch_vectors: { x: number; y: number; z: number }[];
  circuit_depth: number;
  num_gates: number;
}

// ── Gate metadata ─────────────────────────────────────────────────────────────

const GATE_META: Record<GateType, { label: string; color: string; bg: string; desc: string; detail: string }> = {
  H: { label: 'H', color: '#00ffff',  bg: 'rgba(0,255,255,0.15)',   desc: 'Hadamard',      detail: '|0⟩ → |+⟩  superposition' },
  X: { label: 'X', color: '#22c55e',  bg: 'rgba(34,197,94,0.15)',   desc: 'Pauli-X',       detail: '|0⟩↔|1⟩  bit flip' },
  Y: { label: 'Y', color: '#eab308',  bg: 'rgba(234,179,8,0.15)',   desc: 'Pauli-Y',       detail: 'bit+phase flip' },
  Z: { label: 'Z', color: '#3b82f6',  bg: 'rgba(59,130,246,0.15)',  desc: 'Pauli-Z',       detail: '|1⟩ → -|1⟩  phase flip' },
  S: { label: 'S', color: '#8b5cf6',  bg: 'rgba(139,92,246,0.15)',  desc: 'Phase (√Z)',    detail: '|1⟩ → i|1⟩' },
  T: { label: 'T', color: '#ec4899',  bg: 'rgba(236,72,153,0.15)',  desc: 'T gate (π/8)',  detail: '|1⟩ → e^(iπ/4)|1⟩' },
  CNOT: { label: 'CX', color: '#f97316', bg: 'rgba(249,115,22,0.15)', desc: 'CNOT',        detail: 'entangles two qubits' },
};

const NUM_STEPS = 8;
const CELL = 52; // px per cell

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fmtAmp(r: number, i: number) {
  const rs = r >= 0 ? ` ${r.toFixed(3)}` : r.toFixed(3);
  const is = i >= 0 ? `+${i.toFixed(3)}` : i.toFixed(3);
  return `${rs}${is}i`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GateSymbol({ gate }: { gate: PlacedGate }) {
  const meta = GATE_META[gate.type];
  if (gate.type === 'CNOT') {
    // Control dot
    return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        className="w-5 h-5 rounded-full z-10"
        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
    );
  }
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
      className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border z-10 select-none"
      style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}80`, boxShadow: `0 0 8px ${meta.color}33` }}>
      {meta.label}
    </motion.div>
  );
}

function CnotTarget() {
  const meta = GATE_META.CNOT;
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
      className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-xl border-2 z-10 select-none"
      style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}15` }}>
      ⊕
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CircuitComposerPage() {
  const [numQubits, setNumQubits] = useState(2);
  const [selectedGate, setSelectedGate] = useState<GateType | null>('H');
  const [gates, setGates] = useState<PlacedGate[]>([]);
  const [cnotPending, setCnotPending] = useState<{ qubit: number; step: number } | null>(null);
  const [result, setResult] = useState<CircuitResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cell click handler ───────────────────────────────────────────────────

  const handleCellClick = useCallback((qubit: number, step: number) => {
    if (!selectedGate) return;

    // Toggle off any gate already in this cell
    const existing = gates.find(
      g => (g.qubit === qubit && g.step === step) ||
           (g.type === 'CNOT' && g.target === qubit && g.step === step)
    );
    if (existing) {
      setGates(prev => prev.filter(g => g.id !== existing.id));
      setCnotPending(null);
      return;
    }

    if (selectedGate === 'CNOT') {
      if (!cnotPending) {
        setCnotPending({ qubit, step });
      } else if (cnotPending.step === step && cnotPending.qubit !== qubit) {
        setGates(prev => [...prev, {
          id: uid(), type: 'CNOT',
          qubit: cnotPending.qubit, step, target: qubit,
        }]);
        setCnotPending(null);
      } else {
        // Different step or same qubit — restart
        setCnotPending({ qubit, step });
      }
      return;
    }

    setGates(prev => [...prev, { id: uid(), type: selectedGate, qubit, step }]);
  }, [selectedGate, gates, cnotPending]);

  // ── Qubit count change ───────────────────────────────────────────────────

  const changeQubits = (n: number) => {
    setNumQubits(n);
    setGates([]);
    setResult(null);
    setCnotPending(null);
  };

  // ── Run circuit ──────────────────────────────────────────────────────────

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const payload = {
        num_qubits: numQubits,
        gates: gates.map(({ type, qubit, step, target }) => ({ type, qubit, step, target })),
      };
      const res = await axios.post('http://localhost:8000/quantum/circuit', payload);
      setResult(res.data);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Circuit run failed';
      setError(msg);
    }
    setIsRunning(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const gridW = NUM_STEPS * CELL;
  const gridH = numQubits * CELL;
  const cnotGates = gates.filter(g => g.type === 'CNOT');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold font-mono text-quantum-cyan">⊕ Circuit Composer</h1>
        <p className="text-gray-400 mt-1">
          Select a gate, click qubit wires to place it, then measure to run the circuit on a real Qiskit simulator.
        </p>
      </div>

      {/* ── Top controls ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 font-mono">Qubits:</span>
          {[1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => changeQubits(n)}
              className={`w-8 h-8 rounded-lg font-mono text-sm font-bold transition-all ${
                numQubits === n
                  ? 'bg-quantum-cyan text-black shadow-cyan'
                  : 'border border-quantum-border text-gray-400 hover:border-quantum-cyan'
              }`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => { setGates([]); setResult(null); setCnotPending(null); }}
          className="btn-outline text-sm">
          Clear
        </button>
        <button onClick={handleRun}
          disabled={isRunning}
          className="btn-cyan disabled:opacity-50 disabled:cursor-not-allowed">
          {isRunning ? 'Running Qiskit...' : 'Measure →'}
        </button>
      </div>

      {/* ── Gate palette ── */}
      <div className="card-quantum p-4">
        <p className="text-xs text-gray-500 font-mono mb-3">
          Gate Palette
          {selectedGate === 'CNOT' && cnotPending && (
            <span className="text-orange-400 ml-2 animate-pulse">
              ● CNOT control set on step {cnotPending.step + 1} · now click the target qubit
            </span>
          )}
          {selectedGate !== 'CNOT' && (
            <span className="text-gray-600 ml-2">— click a gate then click a qubit wire cell</span>
          )}
        </p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(GATE_META) as GateType[]).map(gtype => {
            const meta = GATE_META[gtype];
            const active = selectedGate === gtype;
            return (
              <button key={gtype}
                onClick={() => { setSelectedGate(active ? null : gtype); setCnotPending(null); }}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border transition-all"
                style={{
                  borderColor: active ? meta.color : 'rgba(255,255,255,0.08)',
                  background: active ? meta.bg : 'transparent',
                  boxShadow: active ? `0 0 12px ${meta.color}44` : 'none',
                }}>
                <span className="text-xl font-mono font-bold leading-none" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-gray-500 leading-none">{meta.desc}</span>
                <span className="text-[9px] text-gray-600 leading-none">{meta.detail}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Circuit grid ── */}
      <div className="card-quantum p-4 overflow-x-auto">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 'max-content' }}>

          {/* Step number labels */}
          <div style={{ display: 'flex', marginLeft: 56 }}>
            {Array.from({ length: NUM_STEPS }, (_, s) => (
              <div key={s} style={{ width: CELL, textAlign: 'center' }}
                className="text-xs text-gray-600 font-mono pb-1">
                {s + 1}
              </div>
            ))}
          </div>

          {/* Qubit row labels + wire area */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>

            {/* Qubit labels column */}
            <div style={{ width: 56, flexShrink: 0 }}>
              {Array.from({ length: numQubits }, (_, q) => (
                <div key={q} style={{ height: CELL }}
                  className="flex items-center justify-end pr-3 font-mono text-sm text-quantum-cyan">
                  |q{q}⟩
                </div>
              ))}
            </div>

            {/* Grid: SVG wires/lines + absolute gate cells */}
            <div className="relative" style={{ width: gridW, height: gridH }}>

              {/* SVG layer: horizontal wires + CNOT vertical lines */}
              <svg className="absolute inset-0 pointer-events-none"
                width={gridW} height={gridH}>
                {/* Horizontal qubit wires */}
                {Array.from({ length: numQubits }, (_, q) => (
                  <line key={q}
                    x1={0} y1={q * CELL + CELL / 2}
                    x2={gridW} y2={q * CELL + CELL / 2}
                    stroke="rgba(156,163,175,0.25)" strokeWidth={1} />
                ))}
                {/* Step separator guides */}
                {Array.from({ length: NUM_STEPS + 1 }, (_, s) => (
                  <line key={s}
                    x1={s * CELL} y1={0} x2={s * CELL} y2={gridH}
                    stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
                ))}
                {/* CNOT vertical connections */}
                {cnotGates.map(g => {
                  const x = g.step * CELL + CELL / 2;
                  const y1 = g.qubit * CELL + CELL / 2;
                  const y2 = g.target! * CELL + CELL / 2;
                  return (
                    <line key={g.id} x1={x} y1={y1} x2={x} y2={y2}
                      stroke={GATE_META.CNOT.color} strokeWidth={2} opacity={0.7} />
                  );
                })}
                {/* Pending CNOT indicator */}
                {cnotPending && (
                  <circle
                    cx={cnotPending.step * CELL + CELL / 2}
                    cy={cnotPending.qubit * CELL + CELL / 2}
                    r={8}
                    fill={GATE_META.CNOT.color}
                    opacity={0.8}
                  />
                )}
              </svg>

              {/* Clickable cells (absolutely positioned) */}
              {Array.from({ length: numQubits }, (_, q) =>
                Array.from({ length: NUM_STEPS }, (_, s) => {
                  const gateHere = gates.find(g => g.qubit === q && g.step === s);
                  const cnotTarget = gates.find(
                    g => g.type === 'CNOT' && g.target === q && g.step === s
                  );
                  const isPendingCell = cnotPending?.qubit === q && cnotPending?.step === s;
                  const occupied = !!(gateHere || cnotTarget);

                  return (
                    <div key={`${q}-${s}`}
                      className="absolute flex items-center justify-center cursor-pointer group"
                      style={{ left: s * CELL, top: q * CELL, width: CELL, height: CELL }}
                      onClick={() => handleCellClick(q, s)}>

                      {/* Hover highlight */}
                      {!occupied && !isPendingCell && (
                        <div className="absolute inset-2 rounded-lg border border-transparent group-hover:border-gray-700 transition-colors" />
                      )}
                      {isPendingCell && (
                        <div className="absolute inset-2 rounded-lg border border-orange-500 bg-orange-500/10 animate-pulse" />
                      )}

                      {/* Gate or CNOT symbol */}
                      {gateHere && <GateSymbol gate={gateHere} />}
                      {cnotTarget && <CnotTarget />}
                    </div>
                  );
                })
              )}
            </div>

            {/* |0⟩ initial state labels on the right (spacer) */}
          </div>
        </div>
      </div>

      {/* ── Gate legend ── */}
      <div className="card-quantum p-3 text-xs text-gray-500 font-mono">
        Circuit has <span className="text-quantum-cyan">{gates.length}</span> gate{gates.length !== 1 ? 's' : ''}.
        {gates.length === 0 && ' Place gates on the wires above, then click Measure.'}
        {' '}Click a placed gate to remove it. For CNOT: click control qubit, then target qubit (same step).
      </div>

      {error && (
        <div className="text-red-400 text-sm card-quantum p-3">{error}</div>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && (
          <motion.div key="results"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Metadata */}
            <div className="flex gap-4 text-sm font-mono text-gray-400">
              <span>Circuit depth: <span className="text-quantum-cyan">{result.circuit_depth}</span></span>
              <span>Gates applied: <span className="text-quantum-cyan">{result.num_gates}</span></span>
            </div>

            {/* Measurement probabilities */}
            <div className="card-quantum p-4">
              <p className="text-xs text-gray-500 font-mono mb-3">Measurement Probabilities</p>
              <div className="space-y-2">
                {Object.entries(result.probabilities)
                  .sort(([, a], [, b]) => b - a)
                  .map(([state, prob]) => (
                    <div key={state} className="flex items-center gap-3">
                      <span className="font-mono text-sm text-quantum-cyan w-16 text-right shrink-0">
                        |{state}⟩
                      </span>
                      <div className="flex-1 bg-quantum-surface rounded-full h-5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${prob * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #00ffff88, #8b5cf6)' }}
                        />
                      </div>
                      <span className="font-mono text-sm text-gray-300 w-14 text-right shrink-0">
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Bloch vector mini-display per qubit */}
            <div className="card-quantum p-4">
              <p className="text-xs text-gray-500 font-mono mb-3">
                Qubit States — Bloch sphere coordinates
                <span className="text-gray-600 ml-1">(reduced density matrix, mixed if entangled)</span>
              </p>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${numQubits}, 1fr)` }}>
                {result.bloch_vectors.map((bv, q) => (
                  <div key={q} className="bg-quantum-surface rounded-xl p-3">
                    <p className="text-quantum-cyan font-mono text-sm text-center mb-3">|q{q}⟩</p>
                    {(['x', 'y', 'z'] as const).map(axis => {
                      const val = bv[axis];
                      const pct = ((val + 1) / 2) * 100;
                      return (
                        <div key={axis} className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 font-mono text-xs w-3">{axis}</span>
                          <div className="flex-1 bg-quantum-navy rounded-full h-2 relative overflow-hidden">
                            {/* Center marker */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-700" />
                            <div className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: axis === 'z' ? '#00ffff' : axis === 'x' ? '#8b5cf6' : '#eab308',
                                opacity: 0.8,
                              }} />
                          </div>
                          <span className="text-xs font-mono text-gray-400 w-14 text-right">
                            {val >= 0 ? ' ' : ''}{val.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-center text-xs text-gray-600 mt-2 font-mono">
                      |r|={Math.sqrt(bv.x ** 2 + bv.y ** 2 + bv.z ** 2).toFixed(3)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">
                |r|=1 → pure state · |r|&lt;1 → mixed (entangled with another qubit)
              </p>
            </div>

            {/* Statevector (up to 3 qubits = 8 states) */}
            {numQubits <= 3 && (
              <div className="card-quantum p-4">
                <p className="text-xs text-gray-500 font-mono mb-3">Statevector |ψ⟩</p>
                <div className={`grid gap-2 ${numQubits === 1 ? 'grid-cols-2' : numQubits === 2 ? 'grid-cols-4' : 'grid-cols-4'}`}>
                  {result.statevector.map((amp, i) => {
                    const prob = amp.real ** 2 + amp.imag ** 2;
                    if (prob < 1e-6) return null;
                    const label = `|${i.toString(2).padStart(numQubits, '0')}⟩`;
                    const phase = Math.atan2(amp.imag, amp.real) * (180 / Math.PI);
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-quantum-surface rounded-lg p-3 text-center border border-quantum-border">
                        <p className="text-quantum-cyan font-mono text-sm font-bold">{label}</p>
                        <p className="text-gray-300 font-mono text-xs mt-1 break-all">
                          {fmtAmp(amp.real, amp.imag)}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {(prob * 100).toFixed(1)}% · ∠{phase.toFixed(0)}°
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
