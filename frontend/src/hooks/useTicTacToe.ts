import { useState, useCallback } from 'react';
import { gameApi } from '../api/gameApi';
import type { TTTGameState, EntangledMove } from '../types/games';

/**
 * DFS cycle detection on the entanglement graph.
 * Returns cycle cell indices if found, else null.
 */
function detectCycle(moves: EntangledMove[]): number[] | null {
  if (moves.length < 2) return null;

  // Build adjacency list: cell -> [(neighbor_cell, move_id)]
  const adj = new Map<number, { neighbor: number; moveId: number }[]>();
  for (const move of moves) {
    const [a, b] = move.cells;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ neighbor: b, moveId: move.move_id });
    adj.get(b)!.push({ neighbor: a, moveId: move.move_id });
  }

  const visited = new Set<number>();
  const path: number[] = [];

  function dfs(node: number, parentMoveId: number): number[] | null {
    if (visited.has(node)) {
      const idx = path.indexOf(node);
      return idx >= 0 ? path.slice(idx) : null;
    }
    visited.add(node);
    path.push(node);
    for (const { neighbor, moveId } of adj.get(node) ?? []) {
      if (moveId === parentMoveId) continue;
      const result = dfs(neighbor, moveId);
      if (result) return result;
    }
    path.pop();
    visited.delete(node);
    return null;
  }

  for (const start of adj.keys()) {
    if (!visited.has(start)) {
      const cycle = dfs(start, -1);
      if (cycle) return cycle;
    }
  }
  return null;
}

type TicTacToeHook = {
  game: TTTGameState | null;
  selectedCells: number[];
  isLoading: boolean;
  error: string | null;
  initGame: (vsAI?: boolean, accessToken?: string | null) => Promise<void>;
  selectCell: (idx: number) => void;
  submitMove: () => Promise<void>;
  resetGame: () => void;
  detectedCycleLocal: number[] | null;
};

export function useTicTacToe(): TicTacToeHook {
  const [game, setGame] = useState<TTTGameState | null>(null);
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedCycleLocal, setDetectedCycleLocal] = useState<number[] | null>(null);

  const initGame = useCallback(async (vsAI = true, accessToken?: string | null) => {
    setIsLoading(true);
    setError(null);
    setSelectedCells([]);
    setDetectedCycleLocal(null);
    const state = await gameApi.newTTTGame(vsAI, accessToken);
    setGame(state);
    setIsLoading(false);
  }, []);

  const selectCell = useCallback((idx: number) => {
    if (!game || game.phase === 'game_over') return;
    if (game.current_player !== 'X') return; // wait for AI
    const cell = game.board[idx];
    if (cell.classical_owner) return; // classically taken

    // Block cells that already have an uncollapsed marker from this player
    const hasPlayerMarker = cell.markers.some(
      (m) => m.player === 'X' && !m.collapsed
    );
    if (hasPlayerMarker) return;

    setSelectedCells((prev) => {
      if (prev.includes(idx)) return prev.filter((c) => c !== idx);
      if (prev.length >= 2) return [prev[1], idx];
      return [...prev, idx];
    });
  }, [game]);

  const submitMove = useCallback(async () => {
    if (!game || selectedCells.length !== 2) return;
    setIsLoading(true);
    setError(null);

    // Optimistic local cycle detection
    const hypotheticalMove: EntangledMove = {
      move_id: game.turn_number,
      player: 'X',
      cells: [selectedCells[0], selectedCells[1]],
      turn_number: game.turn_number,
    };
    const hypotheticalMoves = [...game.moves, hypotheticalMove];
    const cycle = detectCycle(hypotheticalMoves);
    if (cycle) setDetectedCycleLocal(cycle);

    try {
      const response = await gameApi.makeTTTMove(game.game_id, 'X', selectedCells);
      setGame(response.game_state);
      setSelectedCells([]);
      // Always clear local cycle indicator after a successful server response
      setDetectedCycleLocal(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? 'Move failed');
    }
    setIsLoading(false);
  }, [game, selectedCells]);

  const resetGame = useCallback(() => {
    setGame(null);
    setSelectedCells([]);
    setError(null);
    setDetectedCycleLocal(null);
  }, []);

  return { game, selectedCells, isLoading, error, initGame, selectCell, submitMove, resetGame, detectedCycleLocal };
}
