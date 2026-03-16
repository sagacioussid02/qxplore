import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCoinGame } from '../hooks/useCoinGame';
import { QuantumCoinVisual } from '../components/games/coin/QuantumCoinVisual';
import { BlochSphere } from '../components/quantum/BlochSphere';
import { CircuitDiagram } from '../components/quantum/CircuitDiagram';
import { ProbabilityBar } from '../components/quantum/ProbabilityBar';
import { TutorPanel } from '../components/agents/TutorPanel';
import { GameMasterBanner } from '../components/agents/GameMasterBanner';
import { useAgentStore } from '../store/agentStore';
import { agentApi } from '../api/agentApi';
import type { TutorContext, GameMasterEvent } from '../types/agents';

const BLOCH_ZERO = { theta: 0, phi: 0, x: 0, y: 0, z: 1 };

export default function CoinGamePage() {
  const { phase, result, betAmount, credits, flip, reset } = useCoinGame();
  const { clearTutor, clearGameMaster, appendTutor, setTutorStreaming, appendGameMaster, setGameMasterStreaming } = useAgentStore();
  const triggerAgents = useCallback(() => {
    if (!result) return;
    clearTutor();
    clearGameMaster();

    const tutorCtx: TutorContext = {
      event_type: 'coin_flip',
      game_state: { last_result: result.result },
      quantum_result: { bloch_before: result.bloch_before, bloch_after: result.bloch_after },
    };

    const gmEvent: GameMasterEvent = {
      event_type: 'coin_flip',
      details: { outcome: result.result === 0 ? 'Heads |0⟩' : 'Tails |1⟩' },
      drama_level: 'medium',
    };

    // Stream tutor
    setTutorStreaming(true);
    const tUrl = agentApi.tutorStreamUrl(tutorCtx);
    const tEs = new EventSource(tUrl);
    tEs.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) { tEs.close(); setTutorStreaming(false); return; }
      appendTutor(d.chunk);
    };
    tEs.onerror = () => { tEs.close(); setTutorStreaming(false); };

    // Stream game master
    setGameMasterStreaming(true);
    const gmUrl = agentApi.gameMasterStreamUrl(gmEvent);
    const gmEs = new EventSource(gmUrl);
    gmEs.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) { gmEs.close(); setGameMasterStreaming(false); return; }
      appendGameMaster(d.chunk);
    };
    gmEs.onerror = () => { gmEs.close(); setGameMasterStreaming(false); };
  }, [result]);

  useEffect(() => {
    if (phase === 'revealing') {
      triggerAgents();
    }
  }, [phase]);

  const handleReset = () => {
    reset();
    clearTutor();
    clearGameMaster();
  };

  const blochBefore = result?.bloch_before ?? BLOCH_ZERO;
  const blochAfter = result?.bloch_after ?? BLOCH_ZERO;
  const probabilities = result?.statevector_before.probabilities ?? { '0': 0.5, '1': 0.5 };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-mono text-quantum-cyan">
          ⚛ Quantum Coin
        </h1>
        <p className="text-gray-400 mt-1">Undecided until observed. Circuit: |0⟩ ── H ── Measure</p>
      </div>

      <GameMasterBanner />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Coin visual + controls */}
        <div className="space-y-6">
          <div className="card-quantum p-8 flex flex-col items-center gap-6">
            <QuantumCoinVisual phase={phase} result={result?.result ?? null} />

            <div className="flex items-center gap-3">
              {phase === 'idle' && (
                <button onClick={flip} disabled={credits < betAmount} className="btn-cyan text-lg px-8 py-3">
                  Observe ({betAmount} credits)
                </button>
              )}
              {phase === 'flipping' && (
                <button disabled className="btn-outline text-lg px-8 py-3 opacity-50">
                  Collapsing...
                </button>
              )}
              {(phase === 'revealing' || phase === 'done') && (
                <button onClick={handleReset} className="btn-outline">
                  Reset ↺
                </button>
              )}
            </div>

            <p className="text-xs text-gray-600 font-mono">
              Credits: {credits} | Bet: {betAmount} | Win: {betAmount * 2}
            </p>
          </div>

          <CircuitDiagram gates={['H']} label="|0⟩" />
        </div>

        {/* Right: Bloch sphere + probabilities */}
        <div className="space-y-4">
          <BlochSphere
            before={blochBefore}
            after={blochAfter}
          />
          <ProbabilityBar
            probabilities={probabilities}
            labels={{ '0': 'Heads', '1': 'Tails' }}
            highlight={result?.result !== undefined ? String(result.result) : undefined}
          />
        </div>
      </div>

      <TutorPanel />

      {/* Educational info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-quantum p-4 space-y-2"
      >
        <p className="text-xs text-gray-500 font-mono">How it works</p>
        <p className="text-sm text-gray-300">
          A qubit starts in the definite state <span className="text-quantum-cyan font-mono">|0⟩</span>.
          The <span className="text-quantum-purple font-mono">Hadamard gate (H)</span> puts it in equal superposition:
          {' '}<span className="font-mono text-white">|+⟩ = (|0⟩ + |1⟩) / √2</span>.
          When measured, the wave function <em>collapses</em> to <span className="text-quantum-cyan font-mono">|0⟩</span>{' '}
          or <span className="text-quantum-purple font-mono">|1⟩</span> with 50% probability each.
          This is run on a real Qiskit quantum circuit.
        </p>
      </motion.div>
    </div>
  );
}
