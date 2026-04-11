import { motion, AnimatePresence } from 'framer-motion';
import { useCircuitTicTacToe } from '../hooks/useCircuitTicTacToe';
import type { GateType, CircuitCell } from '../types/circuitTtt';

const GATE_INFO: Record<GateType, { label: string; symbol: string; desc: string; color: string }> = {
  X: {
    label: 'Pauli-X',
    symbol: 'X',
    desc: 'Flips |0⟩→|1⟩. Guarantees your cell will measure 1.',
    color: '#00ffff',
  },
  H: {
    label: 'Hadamard',
    symbol: 'H',
    desc: 'Creates superposition. 50% chance to measure 0 or 1.',
    color: '#8b5cf6',
  },
  CNOT: {
    label: 'CNOT',
    symbol: 'CX',
    desc: 'Entangles two cells. Control flips target if control=1.',
    color: '#ec4899',
  },
};

function GateButton({
  gate, selected, onClick,
}: { gate: GateType; selected: boolean; onClick: () => void }) {
  const info = GATE_INFO[gate];
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg border transition-all duration-200"
      style={{
        borderColor: selected ? info.color : 'rgba(255,255,255,0.1)',
        background: selected ? `${info.color}18` : 'transparent',
        color: selected ? info.color : '#9ca3af',
      }}
    >
      <span className="font-mono font-bold text-lg">{info.symbol}</span>
      <span className="text-xs font-mono">{info.label}</span>
    </button>
  );
}

function CellTile({
  cell, isSelected, isTouched, isMeasured, onClick,
}: {
  cell: CircuitCell;
  isSelected: boolean;
  isTouched: boolean;
  isMeasured: boolean;
  onClick: () => void;
}) {
  const info = cell.gate ? GATE_INFO[cell.gate] : null;
  const isEntangled = cell.entangled_with !== null;
  const measured = isMeasured && cell.classical_value !== null;
  const won = measured && cell.classical_owner !== null;

  const bg = isSelected
    ? 'rgba(0,255,255,0.15)'
    : isTouched
    ? `${info?.color ?? '#ffffff'}0d`
    : 'rgba(255,255,255,0.03)';

  const border = isSelected
    ? 'rgba(0,255,255,0.7)'
    : won
    ? (cell.classical_owner === 'X' ? 'rgba(0,255,255,0.6)' : 'rgba(139,92,246,0.6)')
    : isTouched
    ? `${info?.color ?? '#ffffff'}40`
    : 'rgba(255,255,255,0.08)';

  return (
    <motion.button
      onClick={onClick}
      disabled={isMeasured || (isTouched && !isSelected)}
      whileHover={!isMeasured && !isTouched ? { scale: 1.04 } : {}}
      whileTap={!isMeasured && !isTouched ? { scale: 0.97 } : {}}
      className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all duration-200 relative overflow-hidden"
      style={{ background: bg, borderColor: border }}
    >
      {/* Cell number */}
      <span className="absolute top-1 left-2 text-[10px] font-mono text-gray-600">{cell.index + 1}</span>

      {/* Gate symbol */}
      {cell.gate && (
        <span className="font-mono font-bold text-2xl" style={{ color: info?.color }}>
          {GATE_INFO[cell.gate].symbol}
        </span>
      )}

      {/* Owner tag */}
      {cell.owner && !measured && (
        <span className="text-[10px] font-mono opacity-60" style={{ color: info?.color }}>
          {cell.owner}
        </span>
      )}

      {/* Entanglement link */}
      {isEntangled && !measured && (
        <span className="text-[9px] font-mono text-pink-400 opacity-70">
          ⟷{(cell.entangled_with ?? 0) + 1}
        </span>
      )}

      {/* Measured result */}
      {measured && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center"
        >
          <span
            className="font-mono font-bold text-2xl"
            style={{ color: cell.classical_owner === 'X' ? '#00ffff' : cell.classical_owner === 'O' ? '#8b5cf6' : '#4b5563' }}
          >
            {cell.classical_owner ?? '·'}
          </span>
          <span className="text-[10px] font-mono text-gray-500">|{cell.classical_value}⟩</span>
        </motion.div>
      )}

      {/* Selected highlight pulse */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ background: 'rgba(0,255,255,0.1)' }}
        />
      )}
    </motion.button>
  );
}

function WinLine({ winner }: { winner: string }) {
  const color = winner === 'X' ? '#00ffff' : winner === 'O' ? '#8b5cf6' : '#f59e0b';
  const label = winner === 'draw' ? "It's a draw!" : `Player ${winner} wins!`;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-4"
    >
      <span className="text-2xl font-mono font-bold" style={{ color }}>{label}</span>
    </motion.div>
  );
}

export default function CircuitTTTPage() {
  const {
    game, selectedCells, selectedGate, isLoading, error, lastCollapse,
    initGame, selectGate, toggleCell, submitMove, triggerMeasure, resetGame,
  } = useCircuitTicTacToe();

  const touched = new Set(game?.moves.flatMap(m => m.cells) ?? []);
  const neededCells = selectedGate === 'CNOT' ? 2 : 1;
  const readyToSubmit = selectedCells.length === neededCells;
  const canMeasure = (game?.moves.length ?? 0) > 0 && !game?.measured && game?.phase !== 'game_over';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-mono font-bold text-3xl text-white">
          Circuit <span className="text-quantum-pink">Quantum TTT</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          PDF variant — apply gates (X, H, CNOT) to cells, then measure to collapse the board.
        </p>
      </div>

      {/* Variant comparison banner */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="card-quantum p-3 border-l-2 border-quantum-cyan">
          <p className="text-quantum-cyan font-bold mb-1">Classic Quantum TTT <span className="text-gray-500">/ttt</span></p>
          <p className="text-gray-400">Moves entangle pairs of cells. Cycles force Qiskit collapse.</p>
        </div>
        <div className="card-quantum p-3 border-l-2 border-quantum-pink">
          <p className="text-quantum-pink font-bold mb-1">Circuit TTT <span className="text-gray-500">← you are here</span></p>
          <p className="text-gray-400">Apply X/H/CNOT gates to qubits. Measure all at once to reveal ownership.</p>
        </div>
      </div>

      {!game ? (
        /* Start screen */
        <div className="card-quantum p-8 text-center space-y-4">
          <div className="text-6xl mb-2">⚛</div>
          <h2 className="font-mono text-xl text-white">Circuit Quantum Tic-Tac-Toe</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Each player applies quantum gates to cells. When you're ready, collapse the superposition by measuring all qubits — then see who owns what.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => initGame(true)}
              className="px-6 py-2.5 bg-pink-600 hover:bg-pink-500 rounded-lg font-mono text-sm text-white transition-colors"
            >
              vs AI
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Local 2-player mode is not available yet"
              className="px-6 py-2.5 bg-gray-800 rounded-lg font-mono text-sm text-gray-500 cursor-not-allowed opacity-70"
            >
              2 Players (Coming Soon)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {game.phase !== 'game_over' && !game.measured && (
                <>
                  <span className="text-gray-400 text-sm font-mono">Turn {game.turn_number}</span>
                  <span
                    className="font-mono font-bold px-3 py-1 rounded-full text-sm border"
                    style={{
                      color: game.current_player === 'X' ? '#00ffff' : '#8b5cf6',
                      borderColor: game.current_player === 'X' ? 'rgba(0,255,255,0.4)' : 'rgba(139,92,246,0.4)',
                      background: game.current_player === 'X' ? 'rgba(0,255,255,0.08)' : 'rgba(139,92,246,0.08)',
                    }}
                  >
                    {game.current_player === 'X' ? 'Your turn' : "AI's turn"}
                  </span>
                </>
              )}
              {game.measured && <span className="font-mono text-yellow-400 text-sm">Board collapsed ↓</span>}
            </div>
            <button
              onClick={() => { resetGame(); }}
              className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors"
            >
              New game
            </button>
          </div>

          {game.winner && <WinLine winner={game.winner} />}

          {/* Gate selector */}
          {!game.measured && game.phase !== 'game_over' && game.current_player === 'X' && (
            <div className="space-y-2">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Choose gate</p>
              <div className="flex gap-2">
                {(['X', 'H', 'CNOT'] as GateType[]).map(g => (
                  <GateButton key={g} gate={g} selected={selectedGate === g} onClick={() => selectGate(g)} />
                ))}
              </div>
              <p className="text-xs text-gray-500">{GATE_INFO[selectedGate].desc}</p>
              {selectedGate === 'CNOT' && (
                <p className="text-xs text-pink-400 font-mono">Select control cell first, then target cell</p>
              )}
            </div>
          )}

          {/* Board */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
          >
            {game.board.map(cell => (
              <CellTile
                key={cell.index}
                cell={cell}
                isSelected={selectedCells.includes(cell.index)}
                isTouched={touched.has(cell.index)}
                isMeasured={game.measured}
                onClick={() => toggleCell(cell.index)}
              />
            ))}
          </div>

          {/* Submit / Measure row */}
          <div className="flex gap-3 flex-wrap">
            {!game.measured && game.phase !== 'game_over' && game.current_player === 'X' && (
              <button
                onClick={submitMove}
                disabled={!readyToSubmit || isLoading}
                className="px-5 py-2 rounded-lg font-mono text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: readyToSubmit ? '#ec4899' : '#374151', color: 'white' }}
              >
                {isLoading ? 'Placing…' : `Apply ${GATE_INFO[selectedGate].label}`}
              </button>
            )}

            {canMeasure && (
              <button
                onClick={triggerMeasure}
                disabled={isLoading}
                className="px-5 py-2 rounded-lg font-mono text-sm font-semibold bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white transition-colors"
              >
                {isLoading ? 'Measuring…' : '⚡ Measure All Qubits'}
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          {/* Measurement result breakdown */}
          <AnimatePresence>
            {lastCollapse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-quantum p-4 space-y-3"
              >
                <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Measurement results</p>
                <div className="flex gap-2 flex-wrap">
                  {lastCollapse.measurement_bits.map((bit, i) => {
                    const cell = game.board[i];
                    const ownerColor = cell.classical_owner === 'X' ? '#00ffff' : cell.classical_owner === 'O' ? '#8b5cf6' : '#4b5563';
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-mono text-gray-500">q{i}</span>
                        <span
                          className="font-mono font-bold text-sm px-2 py-0.5 rounded border"
                          style={{
                            color: ownerColor,
                            borderColor: `${ownerColor}40`,
                            background: `${ownerColor}10`,
                          }}
                        >
                          |{bit}⟩
                        </span>
                        {cell.owner && (
                          <span className="text-[9px] font-mono text-gray-500">{cell.owner}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  Cells measuring |1⟩ go to whoever applied the gate there. |0⟩ → unclaimed.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Move log */}
          {game.moves.length > 0 && (
            <div className="card-quantum p-4 space-y-2">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Circuit gates applied</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {game.moves.map(m => (
                  <div key={m.move_id} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className="font-bold w-4"
                      style={{ color: m.player === 'X' ? '#00ffff' : '#8b5cf6' }}
                    >
                      {m.player}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: `${GATE_INFO[m.gate].color}18`, color: GATE_INFO[m.gate].color }}
                    >
                      {GATE_INFO[m.gate].symbol}
                    </span>
                    <span className="text-gray-400">
                      {m.gate === 'CNOT'
                        ? `cell ${m.cells[0] + 1} → cell ${m.cells[1] + 1}`
                        : `cell ${m.cells[0] + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to play */}
          <details className="card-quantum p-4 text-xs font-mono text-gray-400 cursor-pointer">
            <summary className="text-gray-300 font-semibold mb-2 cursor-pointer">How to play</summary>
            <ul className="space-y-1 mt-2 list-disc list-inside">
              <li>Select a gate (X, H, or CNOT) and click a cell to apply it.</li>
              <li><span className="text-quantum-cyan">X gate</span> — flips the qubit to |1⟩. Guarantees ownership if measured 1.</li>
              <li><span className="text-quantum-purple">H gate</span> — puts the qubit in 50/50 superposition. Gamble!</li>
              <li><span className="text-quantum-pink">CNOT gate</span> — entangles two cells. Flip your cell to also flip the target.</li>
              <li>Press <span className="text-yellow-400">Measure All Qubits</span> at any time to collapse the circuit.</li>
              <li>Cells measuring |1⟩ are owned by whoever applied the gate. Win with 3-in-a-row.</li>
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
