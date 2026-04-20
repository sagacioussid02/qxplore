import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallenge } from '../hooks/useChallenge';
import { useAuth } from '../hooks/useAuth';
import { ScoreBreakdown } from '../components/prep/ScoreBreakdown';
import { TimerBadge } from '../components/prep/TimerBadge';
import { HintPanel } from '../components/prep/HintPanel';
import { LeaderboardTable } from '../components/prep/LeaderboardTable';
import { PREP_MAX_QUBITS } from '../config';
import type { GateInstruction } from '../types/challenge';

// ── Embedded composer types & constants ─────────────────────────────────────

type GateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'CNOT';

interface PlacedGate {
  id: string;
  type: GateType;
  qubit: number;
  step: number;
  target?: number;
}

const GATE_META: Record<GateType, { label: string; color: string; bg: string; desc: string }> = {
  H:    { label: 'H',  color: '#00ffff', bg: 'rgba(0,255,255,0.15)',   desc: 'Hadamard' },
  X:    { label: 'X',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   desc: 'Pauli-X' },
  Y:    { label: 'Y',  color: '#eab308', bg: 'rgba(234,179,8,0.15)',   desc: 'Pauli-Y' },
  Z:    { label: 'Z',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  desc: 'Pauli-Z' },
  S:    { label: 'S',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  desc: 'Phase' },
  T:    { label: 'T',  color: '#ec4899', bg: 'rgba(236,72,153,0.15)',  desc: 'T gate' },
  CNOT: { label: 'CX', color: '#f97316', bg: 'rgba(249,115,22,0.15)', desc: 'CNOT' },
};

const NUM_STEPS = 8;
const CELL = 52;
const DEFAULT_MAX_GATES = 64;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Gate symbol components ────────────────────────────────────────────────────

function GateSymbol({ gate }: { gate: PlacedGate }) {
  const meta = GATE_META[gate.type];
  if (gate.type === 'CNOT') {
    return (
      <div className="w-5 h-5 rounded-full z-10"
        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border z-10 select-none"
      style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}80` }}>
      {meta.label}
    </div>
  );
}

function CnotTarget() {
  const meta = GATE_META.CNOT;
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-xl border-2 z-10 select-none"
      style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}15` }}>
      ⊕
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, accessToken, user } = useAuth();

  const {
    challenge, leaderboard, loading, error,
    canViewLeaderboard, leaderboardStatus, leaderboardError,
    elapsedSeconds, timerRunning, startTimer, resetTimer,
    result, submitting, submitError, submit, resetResult,
  } = useChallenge(slug ?? '', accessToken);

  // ── Composer state ────────────────────────────────────────────────────────
  const [numQubits, setNumQubits] = useState(2);
  const [selectedGate, setSelectedGate] = useState<GateType | null>('H');
  const [gates, setGates] = useState<PlacedGate[]>([]);
  const [cnotPending, setCnotPending] = useState<{ qubit: number; step: number } | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const maxGates = challenge?.constraints.max_gates ?? DEFAULT_MAX_GATES;

  // Reset composer when challenge loads
  useEffect(() => {
    if (challenge) {
      setNumQubits(Math.min(challenge.constraints.max_qubits, PREP_MAX_QUBITS));
      setGates([]);
      setCnotPending(null);
      setComposerError(null);
    }
  }, [challenge?.slug]);

  // Start timer on first gate placement
  const timerStarted = timerRunning || result != null;

  const handleCellClick = useCallback((qubit: number, step: number) => {
    if (!selectedGate) return;

    if (!timerStarted && !result) startTimer();

    const existing = gates.find(
      g => (g.qubit === qubit && g.step === step) ||
           (g.type === 'CNOT' && g.target === qubit && g.step === step),
    );
    if (existing) {
      setGates(prev => prev.filter(g => g.id !== existing.id));
      setCnotPending(null);
      setComposerError(null);
      return;
    }

    if (gates.length >= maxGates) {
      setComposerError(`Max gates reached (${maxGates})`);
      return;
    }
    setComposerError(null);

    if (selectedGate === 'CNOT') {
      if (!cnotPending) {
        setCnotPending({ qubit, step });
      } else if (cnotPending.step === step && cnotPending.qubit !== qubit) {
        setGates(prev => [...prev, { id: uid(), type: 'CNOT', qubit: cnotPending.qubit, step, target: qubit }]);
        setCnotPending(null);
      } else {
        setCnotPending({ qubit, step });
      }
      return;
    }

    setGates(prev => [...prev, { id: uid(), type: selectedGate, qubit, step }]);
  }, [selectedGate, gates, cnotPending, timerStarted, result, startTimer, maxGates]);

  const clearComposer = () => {
    setGates([]);
    setCnotPending(null);
    setComposerError(null);
    resetTimer();
    resetResult();
  };

  const handleSubmit = async () => {
    const instructions: GateInstruction[] = gates.map(g => ({
      type: g.type,
      qubit: g.qubit,
      step: g.step,
      ...(g.target != null ? { target: g.target } : {}),
    }));
    await submit(instructions);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const gridW = NUM_STEPS * CELL;
  const gridH = numQubits * CELL;
  const cnotGates = gates.filter(g => g.type === 'CNOT');

  const timeLimit = challenge?.constraints.time_limit_seconds;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <p className="font-mono text-gray-500 animate-pulse">Loading challenge…</p>;
  }
  if (error || !challenge) {
    return <p className="font-mono text-red-400">Error: {error ?? 'Challenge not found'}</p>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
        <Link to="/prep" className="hover:text-quantum-cyan transition-colors">Prep</Link>
        <span>/</span>
        <span className="text-gray-400">{challenge.title}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-quantum-cyan">{challenge.title}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-xs font-mono capitalize text-gray-500">{challenge.category}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs font-mono capitalize text-gray-500">{challenge.difficulty}</span>
            {challenge.optimal_gates && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-xs font-mono text-gray-500">par {challenge.optimal_gates} gates</span>
              </>
            )}
          </div>
        </div>
        <TimerBadge seconds={elapsedSeconds} running={timerRunning} limit={timeLimit} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left panel: problem + hints + leaderboard ── */}
        <div className="space-y-4">
          {/* Problem statement */}
          <div className="card-quantum p-5">
            <div
              className="prose prose-invert prose-sm max-w-none text-gray-300 font-mono text-xs leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {challenge.description}
            </div>
          </div>

          {/* Constraints */}
          <div className="card-quantum p-4 text-xs font-mono text-gray-500 space-y-1">
            <p className="text-gray-400 font-semibold mb-2">Constraints</p>
            <p>Max qubits: <span className="text-quantum-cyan">{challenge.constraints.max_qubits}</span></p>
            <p>Max gates: <span className="text-quantum-cyan">{challenge.constraints.max_gates}</span></p>
            <p>Time limit: <span className="text-quantum-cyan">{challenge.constraints.time_limit_seconds}s</span></p>
          </div>

          {/* Hints */}
          {(() => {
            const authUser = user as ({
              tier?: string;
              user_metadata?: { tier?: string };
              app_metadata?: { tier?: string };
            } | null);
            const userTier = (
              authUser?.tier ??
              authUser?.user_metadata?.tier ??
              authUser?.app_metadata?.tier
            )?.toLowerCase();
            const paidTiers = new Set(['prep', 'pro', 'premium', 'plus', 'team', 'enterprise']);
            const hasHintAccess = isAuthenticated && !!userTier && paidTiers.has(userTier);
            const hintsLocked = !hasHintAccess;
            const hasHints = challenge.hints.length > 0;

            return hasHints || hintsLocked ? (
              <HintPanel
                hints={challenge.hints}
                locked={hintsLocked}
              />
            ) : (
              <div className="card-quantum p-4">
                <p className="text-xs font-mono text-gray-400 mb-2">Hints</p>
                <p className="text-xs font-mono text-gray-500">No hints available for this challenge.</p>
              </div>
            );
          })()}
          {/* Leaderboard */}
          {canViewLeaderboard ? (
            <div className="card-quantum p-4">
              <p className="text-xs font-mono text-gray-400 mb-3">Top Scores</p>
              <LeaderboardTable entries={leaderboard} currentUserId={user?.id} />
            </div>
          ) : leaderboardStatus === 'error' ? (
            <div className="card-quantum p-4">
              <p className="text-xs font-mono text-gray-400 mb-2">Top Scores</p>
              <p className="text-xs font-mono text-red-400">{leaderboardError}</p>
            </div>
          ) : (
            <div className="card-quantum p-4">
              <p className="text-xs font-mono text-gray-400 mb-2">Top Scores</p>
              <p className="text-xs font-mono text-gray-500">Leaderboard is available for Prep subscribers.</p>
            </div>
          )}
        </div>

        {/* ── Right panel: composer + submit ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Gate palette */}
          <div className="card-quantum p-4">
            <p className="text-xs text-gray-500 font-mono mb-3">
              Gate Palette
              {selectedGate === 'CNOT' && cnotPending && (
                <span className="text-orange-400 ml-2 animate-pulse">
                  ● CNOT control set on step {cnotPending.step + 1} · click target qubit
                </span>
              )}
            </p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(GATE_META) as GateType[]).map(gtype => {
                const meta = GATE_META[gtype];
                const active = selectedGate === gtype;
                return (
                  <button key={gtype}
                    onClick={() => { setSelectedGate(active ? null : gtype); setCnotPending(null); setComposerError(null); }}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all"
                    style={{
                      borderColor: active ? meta.color : 'rgba(255,255,255,0.08)',
                      background: active ? meta.bg : 'transparent',
                      boxShadow: active ? `0 0 10px ${meta.color}44` : 'none',
                    }}>
                    <span className="text-lg font-mono font-bold leading-none" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-gray-500 leading-none">{meta.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qubit count */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono">Qubits:</span>
            {Array.from({ length: Math.min(challenge.constraints.max_qubits, PREP_MAX_QUBITS) }, (_, i) => i + 1).map(n => (
              <button key={n}
                onClick={() => { setNumQubits(n); setGates([]); setCnotPending(null); setComposerError(null); }}
                className={`w-8 h-8 rounded-lg font-mono text-sm font-bold transition-all ${
                  numQubits === n
                    ? 'bg-quantum-cyan text-black'
                    : 'border border-quantum-border text-gray-400 hover:border-quantum-cyan'
                }`}>
                {n}
              </button>
            ))}
            <span className="text-xs font-mono text-gray-600 ml-2">
              {gates.length}/{maxGates} gates
            </span>
          </div>

          {/* Circuit grid */}
          <div className="card-quantum p-4 overflow-x-auto">
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'max-content' }}>
              {/* Step labels */}
              <div style={{ display: 'flex', marginLeft: 56 }}>
                {Array.from({ length: NUM_STEPS }, (_, s) => (
                  <div key={s} style={{ width: CELL, textAlign: 'center' }}
                    className="text-xs text-gray-600 font-mono pb-1">
                    {s + 1}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex' }}>
                {/* Qubit labels */}
                <div style={{ width: 56, flexShrink: 0 }}>
                  {Array.from({ length: numQubits }, (_, q) => (
                    <div key={q} style={{ height: CELL }}
                      className="flex items-center justify-end pr-3 font-mono text-sm text-quantum-cyan">
                      |q{q}⟩
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="relative" style={{ width: gridW, height: gridH }}>
                  <svg className="absolute inset-0 pointer-events-none" width={gridW} height={gridH}>
                    {Array.from({ length: numQubits }, (_, q) => (
                      <line key={q}
                        x1={0} y1={q * CELL + CELL / 2}
                        x2={gridW} y2={q * CELL + CELL / 2}
                        stroke="rgba(156,163,175,0.25)" strokeWidth={1} />
                    ))}
                    {Array.from({ length: NUM_STEPS + 1 }, (_, s) => (
                      <line key={s}
                        x1={s * CELL} y1={0} x2={s * CELL} y2={gridH}
                        stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
                    ))}
                    {cnotGates.map(g => {
                      const x = g.step * CELL + CELL / 2;
                      const y1 = g.qubit * CELL + CELL / 2;
                      const y2 = g.target! * CELL + CELL / 2;
                      return (
                        <line key={g.id} x1={x} y1={y1} x2={x} y2={y2}
                          stroke={GATE_META.CNOT.color} strokeWidth={2} opacity={0.7} />
                      );
                    })}
                    {cnotPending && (
                      <circle
                        cx={cnotPending.step * CELL + CELL / 2}
                        cy={cnotPending.qubit * CELL + CELL / 2}
                        r={8} fill={GATE_META.CNOT.color} opacity={0.8} />
                    )}
                  </svg>

                  {/* Clickable cells */}
                  {Array.from({ length: numQubits }, (_, q) =>
                    Array.from({ length: NUM_STEPS }, (_, s) => {
                      const gateHere = gates.find(g => g.qubit === q && g.step === s);
                      const cnotTarget = gates.find(g => g.type === 'CNOT' && g.target === q && g.step === s);
                      const isPending = cnotPending?.qubit === q && cnotPending?.step === s;
                      const occupied = !!(gateHere || cnotTarget);

                      return (
                        <button key={`${q}-${s}`}
                          type="button"
                          aria-label={`Qubit ${q}, step ${s + 1}`}
                          className="absolute flex items-center justify-center cursor-pointer group"
                          style={{ left: s * CELL, top: q * CELL, width: CELL, height: CELL }}
                          onClick={() => handleCellClick(q, s)}>
                          {!occupied && !isPending && (
                            <div className="absolute inset-2 rounded-lg border border-transparent group-hover:border-gray-700 transition-colors" />
                          )}
                          {isPending && (
                            <div className="absolute inset-2 rounded-lg border border-orange-500 bg-orange-500/10 animate-pulse" />
                          )}
                          {gateHere && <GateSymbol gate={gateHere} />}
                          {cnotTarget && <CnotTarget />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs font-mono text-gray-600">
            Click a gate then click a qubit wire to place it. Click a placed gate to remove it.
            CNOT: click control qubit, then target qubit in the same column.
          </p>

          {/* Action row */}
          <div className="flex gap-3 items-center flex-wrap">
            <button onClick={clearComposer} className="btn-outline text-sm">
              Clear
            </button>

            {!isAuthenticated ? (
              <p className="text-xs font-mono text-gray-500">
                <Link to="/account" className="text-quantum-cyan hover:underline">Sign in</Link> to submit
              </p>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || gates.length === 0}
                className="btn-cyan disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Scoring…' : 'Submit →'}
              </button>
            )}

            {submitError && (
              <p className="text-red-400 text-xs font-mono" role="status" aria-live="polite">{submitError}</p>
            )}
            {composerError && (
              <p className="text-orange-400 text-xs font-mono" role="status" aria-live="polite">{composerError}</p>
            )}
          </div>

          {/* Score result */}
          <AnimatePresence>
            {result && (
              <motion.div
                key="score"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ScoreBreakdown result={result} />
                <div className="flex gap-3 mt-3">
                  <button onClick={clearComposer} className="btn-outline text-sm">
                    Try Again
                  </button>
                  <Link to="/prep" className="btn-outline text-sm no-underline">
                    ← All Challenges
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
