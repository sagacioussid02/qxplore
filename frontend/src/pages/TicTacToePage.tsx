import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTicTacToe } from '../hooks/useTicTacToe';
import { GameMasterBanner } from '../components/agents/GameMasterBanner';
import { TutorPanel } from '../components/agents/TutorPanel';
import { useAgentStore } from '../store/agentStore';
import { useCreditStore } from '../store/creditStore';
import { agentApi } from '../api/agentApi';
import type { TutorContext, GameMasterEvent } from '../types/agents';
import type { TTTCell } from '../types/games';

function CellView({
  cell,
  isSelected,
  isInCycle,
  onClick,
}: {
  cell: TTTCell;
  isSelected: boolean;
  isInCycle: boolean;
  onClick: () => void;
}) {
  const hasClassical = !!cell.classical_owner;

  return (
    <motion.button
      onClick={onClick}
      whileHover={!hasClassical ? { scale: 1.05 } : {}}
      whileTap={!hasClassical ? { scale: 0.95 } : {}}
      className={`
        relative aspect-square rounded-xl border-2 transition-all duration-200 overflow-hidden
        ${isSelected ? 'border-quantum-cyan shadow-cyan' : ''}
        ${isInCycle && !isSelected ? 'border-quantum-amber' : ''}
        ${hasClassical ? 'cursor-default' : 'cursor-pointer'}
        ${!isSelected && !isInCycle ? 'border-quantum-border' : ''}
        bg-quantum-surface hover:bg-quantum-surface
      `}
      style={isInCycle ? { boxShadow: '0 0 15px rgba(245,158,11,0.4)' } : undefined}
    >
      {/* Classical owner */}
      {hasClassical && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className="text-4xl font-mono font-bold"
            style={{ color: cell.classical_owner === 'X' ? '#00ffff' : '#8b5cf6' }}
          >
            {cell.classical_owner}
          </span>
        </motion.div>
      )}

      {/* Quantum markers */}
      {!hasClassical && cell.markers.length > 0 && (
        <div className="absolute inset-0 flex flex-wrap gap-0.5 p-1.5 content-start">
          {cell.markers.map((m) => (
            <span
              key={m.move_id}
              className="text-xs font-mono font-bold px-1 rounded"
              style={{
                color: m.player === 'X' ? '#00ffff' : '#8b5cf6',
                background: m.player === 'X' ? 'rgba(0,255,255,0.1)' : 'rgba(139,92,246,0.1)',
                border: `1px solid ${m.player === 'X' ? '#00ffff44' : '#8b5cf644'}`,
              }}
            >
              {m.player}{m.move_id}
            </span>
          ))}
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && !hasClassical && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-quantum-cyan animate-pulse-glow" />
        </div>
      )}
    </motion.button>
  );
}

function EntanglementLines({ cells }: { cells: TTTCell[]; moves: unknown[] }) {
  // SVG overlay for entanglement lines — drawn between paired cells
  // We'll use a simple grid-based coordinate calculation
  const cellCoords = (idx: number) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return { x: col * 33.33 + 16.67, y: row * 33.33 + 16.67 };
  };

  // Collect pairs from markers
  const pairs = new Set<string>();
  const lines: { a: number; b: number; player: string; moveId: number }[] = [];
  for (const cell of cells) {
    for (const marker of cell.markers) {
      if (!marker.collapsed) {
        const key = [Math.min(cell.index, marker.partner_cell), Math.max(cell.index, marker.partner_cell), marker.move_id].join('-');
        if (!pairs.has(key)) {
          pairs.add(key);
          lines.push({ a: cell.index, b: marker.partner_cell, player: marker.player, moveId: marker.move_id });
        }
      }
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
      {lines.map((line) => {
        const a = cellCoords(line.a);
        const b = cellCoords(line.b);
        const color = line.player === 'X' ? '#00ffff' : '#8b5cf6';
        return (
          <g key={`${line.a}-${line.b}-${line.moveId}`}>
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color}
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.4"
            />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="3"
              fill={color}
              opacity="0.7"
            >
              {line.player}{line.moveId}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const TTT_COST = 45;

export default function TicTacToePage() {
  const { game, selectedCells, isLoading, error, initGame, selectCell, submitMove, resetGame, detectedCycleLocal } = useTicTacToe();
  const { clearTutor, clearGameMaster, appendTutor, setTutorStreaming, appendGameMaster, setGameMasterStreaming } = useAgentStore();
  const { credits, deductCredits } = useCreditStore();
  const prevPhaseRef = useRef<string | null>(null);

  const triggerAgents = useCallback((eventType: string, details: Record<string, unknown>) => {
    clearGameMaster();

    const gmEvent: GameMasterEvent = {
      event_type: eventType as GameMasterEvent['event_type'],
      details,
      drama_level: eventType === 'ttt_win' ? 'high' : 'medium',
    };
    setGameMasterStreaming(true);
    const gmEs = new EventSource(agentApi.gameMasterStreamUrl(gmEvent));
    gmEs.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) { gmEs.close(); setGameMasterStreaming(false); return; }
      appendGameMaster(d.chunk);
    };
    gmEs.onerror = () => { gmEs.close(); setGameMasterStreaming(false); };

    if (eventType !== 'spin_start') {
      clearTutor();
      const tutorCtx: TutorContext = {
        event_type: eventType.replace('ttt_', 'ttt_') as TutorContext['event_type'],
        game_state: { phase: game?.phase, winner: game?.winner },
        player_action: details.description as string,
      };
      setTutorStreaming(true);
      const tEs = new EventSource(agentApi.tutorStreamUrl(tutorCtx));
      tEs.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.done) { tEs.close(); setTutorStreaming(false); return; }
        appendTutor(d.chunk);
      };
      tEs.onerror = () => { tEs.close(); setTutorStreaming(false); };
    }
  }, [game]);

  useEffect(() => {
    if (!game) return;
    if (prevPhaseRef.current === game.phase) return;
    prevPhaseRef.current = game.phase;

    if (game.phase === 'collapsing' || (prevPhaseRef.current === 'cycle_detected' && game.phase === 'placing')) {
      triggerAgents('ttt_collapse', { description: 'Quantum cycle collapsed to classical state' });
    }
    if (game.phase === 'game_over') {
      triggerAgents('ttt_win', { winner: game.winner, description: `${game.winner} wins!` });
    }
  }, [game?.phase]);

  if (!game) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold font-mono text-quantum-cyan">⊗ Quantum Tic Tac Toe</h1>
          <p className="text-gray-400 mt-1">Superposition meets strategy. Each move is two entangled cells.</p>
        </div>

        <div className="card-quantum p-8 text-center space-y-6">
          <div className="space-y-3 text-left text-sm text-gray-300 card-quantum p-4">
            <p className="font-mono text-quantum-cyan font-semibold">Rules</p>
            <p>• Each turn: select <strong>2 cells</strong> — they become an entangled quantum move (e.g. X₁)</p>
            <p>• A cell can hold multiple quantum markers in superposition</p>
            <p>• When moves form a <strong>cycle</strong>, the quantum state collapses via Qiskit measurement</p>
            <p>• After collapse, classical tic-tac-toe win conditions apply</p>
            <p>• AI opponent (Claude) plays strategically as O</p>
          </div>
          <button
            onClick={() => { if (deductCredits(TTT_COST)) initGame(true); }}
            disabled={credits < TTT_COST}
            className="btn-cyan text-lg px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Game vs AI
          </button>
          <p className="text-xs text-gray-500 font-mono">costs {TTT_COST} credits · you have {credits}</p>
        </div>
      </div>
    );
  }

  // Only show cycle highlight when actively in cycle phase — not from stale server field
  const activeCycle =
    detectedCycleLocal ?? (game.phase === 'cycle_detected' ? game.detected_cycle : null);
  const cycleSet = new Set(activeCycle ?? []);
  const isPlayerTurn = game.current_player === 'X' && game.phase === 'placing';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono text-quantum-cyan">⊗ Quantum TTT</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Turn {game.turn_number} ·{' '}
            <span style={{ color: game.current_player === 'X' ? '#00ffff' : '#8b5cf6' }}>
              {game.phase === 'game_over' ? `${game.winner === 'draw' ? 'Draw!' : `${game.winner} wins!`}` :
               isPlayerTurn ? 'Your turn (X) — select 2 cells' :
               isLoading ? 'AI is thinking...' : 'Waiting...'}
            </span>
          </p>
        </div>
        <button onClick={() => { resetGame(); clearTutor(); clearGameMaster(); }} className="btn-outline text-sm">
          New Game
        </button>
      </div>

      <GameMasterBanner />

      {error && (
        <div className="text-quantum-red text-sm card-quantum p-3 border-quantum-red">{error}</div>
      )}

      {/* Phase banners */}
      <AnimatePresence>
        {cycleSet.size > 0 && game.phase !== 'game_over' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card-quantum p-3 border border-quantum-amber text-center"
            style={{ boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
          >
            <p className="text-quantum-amber font-mono font-semibold animate-pulse">
              ⚠ Quantum cycle detected! Running Qiskit collapse circuit...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="card-quantum p-4">
        <div className="relative grid grid-cols-3 gap-2" style={{ maxWidth: 400, margin: '0 auto' }}>
          <EntanglementLines cells={game.board} moves={game.moves} />
          {game.board.map((cell) => (
            <CellView
              key={cell.index}
              cell={cell}
              isSelected={selectedCells.includes(cell.index)}
              isInCycle={cycleSet.has(cell.index)}
              onClick={() => selectCell(cell.index)}
            />
          ))}
        </div>

        {/* Submit move */}
        <div className="flex justify-center mt-4 gap-3">
          {selectedCells.length === 2 && isPlayerTurn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={submitMove}
              disabled={isLoading}
              className="btn-cyan"
            >
              {isLoading ? 'Placing...' : `Place X${game.turn_number} in cells ${selectedCells[0] + 1} & ${selectedCells[1] + 1}`}
            </motion.button>
          )}
          {selectedCells.length === 1 && isPlayerTurn && (
            <p className="text-gray-500 text-sm">Select one more cell</p>
          )}
          {selectedCells.length === 0 && isPlayerTurn && game.phase !== 'game_over' && (
            <p className="text-gray-500 text-sm">Click any 2 cells to place your quantum move</p>
          )}
          {isLoading && !isPlayerTurn && (
            <p className="text-quantum-purple text-sm animate-pulse">AI is computing quantum strategy...</p>
          )}
        </div>
      </div>

      {/* Move history */}
      {game.moves.length > 0 && (
        <div className="card-quantum p-4">
          <p className="text-xs text-gray-500 font-mono mb-2">Move History</p>
          <div className="flex flex-wrap gap-2">
            {game.moves.map((move) => (
              <span
                key={move.move_id}
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  color: move.player === 'X' ? '#00ffff' : '#8b5cf6',
                  background: move.player === 'X' ? 'rgba(0,255,255,0.1)' : 'rgba(139,92,246,0.1)',
                  border: `1px solid ${move.player === 'X' ? '#00ffff44' : '#8b5cf644'}`,
                }}
              >
                {move.player}{move.move_id}: [{move.cells[0] + 1},{move.cells[1] + 1}]
              </span>
            ))}
          </div>
        </div>
      )}

      <TutorPanel />

      {/* Info card */}
      <div className="card-quantum p-4">
        <p className="text-xs text-gray-500 font-mono mb-1">Quantum Mechanics</p>
        <p className="text-sm text-gray-300">
          Each quantum move creates an <span className="text-quantum-cyan font-mono">entangled pair</span> — like two particles whose fates are linked.
          When moves form a cycle in the entanglement graph, a quantum measurement (Qiskit circuit)
          collapses the superposition: each marker lands in one cell, revealing the classical board.
        </p>
      </div>
    </div>
  );
}
