import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quantumApi } from '../api/quantumApi';
import { useCreditStore } from '../store/creditStore';
import { useAgentStore } from '../store/agentStore';
import { agentApi } from '../api/agentApi';
import { GameMasterBanner } from '../components/agents/GameMasterBanner';
import { TutorPanel } from '../components/agents/TutorPanel';
import type { RouletteQuantumResult } from '../types/quantum';
import type { GameMasterEvent, TutorContext } from '../types/agents';

const BET_TYPES = [
  { id: 'red', label: 'Red', color: '#ef4444', payout: 2 },
  { id: 'black', label: 'Black', color: '#6b7280', payout: 2 },
  { id: 'green', label: '0 (Green)', color: '#10b981', payout: 35 },
];

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);


function RouletteWheel({ spinning, result }: { spinning: boolean; result: number | null }) {
  const totalSectors = WHEEL_NUMBERS.length;
  const sectorAngle = 360 / totalSectors;
  const resultIdx = result !== null ? WHEEL_NUMBERS.indexOf(result) : 0;
  const targetAngle = 1440 + resultIdx * sectorAngle;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      <motion.div
        animate={spinning ? { rotate: targetAngle } : { rotate: 0 }}
        transition={spinning ? { duration: 3, ease: [0.2, 0.8, 0.4, 1] } : { duration: 0 }}
        style={{ width: 260, height: 260, borderRadius: '50%', overflow: 'hidden', border: '4px solid #1e2d4a' }}
      >
        <svg viewBox="0 0 260 260" width="260" height="260">
          {WHEEL_NUMBERS.map((num, i) => {
            const angle = i * sectorAngle;
            const color = num === 0 ? '#10b981' : RED_NUMS.has(num) ? '#ef4444' : '#374151';
            const rad = (angle - 90) * (Math.PI / 180);
            const rad2 = ((angle + sectorAngle) - 90) * (Math.PI / 180);
            const r = 128;
            const x1 = 130 + r * Math.cos(rad);
            const y1 = 130 + r * Math.sin(rad);
            const x2 = 130 + r * Math.cos(rad2);
            const y2 = 130 + r * Math.sin(rad2);
            const mid = (angle + sectorAngle / 2 - 90) * (Math.PI / 180);
            const tx = 130 + 100 * Math.cos(mid);
            const ty = 130 + 100 * Math.sin(mid);
            return (
              <g key={i}>
                <path
                  d={`M 130 130 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                  fill={color}
                  stroke="#0a0e1a"
                  strokeWidth="0.5"
                />
                <text
                  x={tx} y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="7"
                  fontFamily="monospace"
                  transform={`rotate(${angle + sectorAngle/2}, ${tx}, ${ty})`}
                >
                  {num}
                </text>
              </g>
            );
          })}
          {/* Center hub */}
          <circle cx="130" cy="130" r="20" fill="#0a0e1a" stroke="#00ffff" strokeWidth="2" />
          <text x="130" y="135" textAnchor="middle" fill="#00ffff" fontSize="10" fontFamily="monospace">⚛</text>
        </svg>
      </motion.div>
      {/* Pointer */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0" style={{
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '16px solid #00ffff',
        filter: 'drop-shadow(0 0 6px #00ffff)',
      }} />
    </div>
  );
}

export default function RouletteGamePage() {
  const [betType, setBetType] = useState<string>('red');
  const [betAmount, setBetAmount] = useState(20);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [result, setResult] = useState<RouletteQuantumResult | null>(null);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const { credits, deductCredits, addCredits } = useCreditStore();
  const { clearGameMaster, appendGameMaster, setGameMasterStreaming,
          clearTutor, appendTutor, setTutorStreaming } = useAgentStore();

  const spin = useCallback(async () => {
    if (!deductCredits(betAmount)) return;
    setPhase('spinning');
    clearGameMaster();
    clearTutor();

    const gmEvent: GameMasterEvent = {
      event_type: 'spin_start',
      details: { bet: betType, amount: betAmount },
      drama_level: 'medium',
    };
    setGameMasterStreaming(true);
    const gmEs = new EventSource(agentApi.gameMasterStreamUrl(gmEvent));
    gmEs.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) { gmEs.close(); setGameMasterStreaming(false); return; }
      appendGameMaster(d.chunk);
    };
    gmEs.onerror = () => { gmEs.close(); setGameMasterStreaming(false); };

    const quantum = await quantumApi.spinRoulette();
    setSpinResult(quantum.result);

    // Wait for animation
    await new Promise(r => setTimeout(r, 3200));
    setResult(quantum);
    setPhase('done');

    // Payout
    const won = betType === quantum.color;
    const payout = BET_TYPES.find(b => b.id === betType)?.payout ?? 2;
    if (won) addCredits(betAmount * payout);

    // Post-spin agents
    clearGameMaster();
    const gmEvent2: GameMasterEvent = {
      event_type: 'spin_result',
      details: { outcome: quantum.outcome_label, color: quantum.color, won, payout: won ? betAmount * payout : 0 },
      drama_level: 'high',
    };
    setGameMasterStreaming(true);
    const gmEs2 = new EventSource(agentApi.gameMasterStreamUrl(gmEvent2));
    gmEs2.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) { gmEs2.close(); setGameMasterStreaming(false); return; }
      appendGameMaster(d.chunk);
    };
    gmEs2.onerror = () => { gmEs2.close(); setGameMasterStreaming(false); };

    const tutorCtx: TutorContext = {
      event_type: 'roulette_spin',
      game_state: { last_outcome_label: quantum.outcome_label, last_color: quantum.color },
      quantum_result: { bitstring: quantum.bitstring, n_qubits: quantum.n_qubits },
    };
    setTutorStreaming(true);
    const tEs = new EventSource(agentApi.tutorStreamUrl(tutorCtx));
    tEs.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) { tEs.close(); setTutorStreaming(false); return; }
      appendTutor(d.chunk);
    };
    tEs.onerror = () => { tEs.close(); setTutorStreaming(false); };
  }, [betType, betAmount, deductCredits, addCredits]);

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setSpinResult(null);
    clearGameMaster();
    clearTutor();
  };

  const betCfg = BET_TYPES.find(b => b.id === betType)!;
  const won = result && betType === result.color;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold font-mono text-quantum-purple">🎡 Quantum Roulette</h1>
        <p className="text-gray-400 mt-1">True randomness from {6} quantum bits in superposition</p>
      </div>

      <GameMasterBanner />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wheel */}
        <div className="card-quantum p-6 flex flex-col items-center gap-6">
          <RouletteWheel spinning={phase === 'spinning'} result={spinResult} />

          {/* Result reveal */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <p className="text-3xl font-mono font-bold" style={{
                  color: result.color === 'red' ? '#ef4444' : result.color === 'green' ? '#10b981' : '#9ca3af'
                }}>
                  {result.outcome_label}
                </p>
                <p className={`text-lg font-semibold ${won ? 'text-quantum-green' : 'text-quantum-red'}`}>
                  {won ? `+${betAmount * betCfg.payout} credits!` : `−${betAmount} credits`}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Quantum bits: {result.bitstring} → {result.result} mod 37 = {result.result}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Betting panel */}
        <div className="space-y-4">
          <div className="card-quantum p-4 space-y-4">
            <p className="font-mono text-sm text-gray-400">Place your bet</p>

            <div className="grid grid-cols-3 gap-2">
              {BET_TYPES.map((bet) => (
                <button
                  key={bet.id}
                  onClick={() => setBetType(bet.id)}
                  disabled={phase === 'spinning'}
                  className={`py-3 rounded-lg font-mono text-sm font-semibold border transition-all ${
                    betType === bet.id
                      ? 'border-white bg-quantum-surface scale-105'
                      : 'border-quantum-border bg-quantum-navy hover:border-white'
                  }`}
                  style={{ color: bet.color }}
                >
                  {bet.label}
                  <br />
                  <span className="text-xs text-gray-500">×{bet.payout}</span>
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs text-gray-500 font-mono mb-2">Bet amount</p>
              <div className="flex gap-2">
                {[10, 20, 50, 100].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    disabled={phase === 'spinning'}
                    className={`flex-1 py-2 rounded text-sm font-mono border transition-all ${
                      betAmount === amt
                        ? 'border-quantum-cyan text-quantum-cyan'
                        : 'border-quantum-border text-gray-400 hover:border-white'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {phase !== 'spinning' ? (
                <button
                  onClick={phase === 'done' ? reset : spin}
                  disabled={credits < betAmount}
                  className={phase === 'done' ? 'btn-outline flex-1' : 'btn-purple flex-1'}
                >
                  {phase === 'done' ? 'Spin Again ↺' : `Spin (${betAmount} credits)`}
                </button>
              ) : (
                <button disabled className="btn-outline flex-1 opacity-50">Spinning...</button>
              )}
            </div>

            <p className="text-xs text-gray-600 font-mono text-center">Balance: {credits} credits</p>
          </div>

          {/* How it works */}
          <div className="card-quantum p-4 space-y-2">
            <p className="text-xs text-gray-500 font-mono">Quantum RNG</p>
            <p className="text-sm text-gray-300">
              6 qubits each get a <span className="text-quantum-purple font-mono">Hadamard gate</span>,
              creating a superposition of all 64 states. Measuring collapses them to a 6-bit number (0-63),
              mapped mod 37 to the wheel. True quantum randomness — no pseudo-random seed.
            </p>
          </div>
        </div>
      </div>

      <TutorPanel />
    </div>
  );
}
