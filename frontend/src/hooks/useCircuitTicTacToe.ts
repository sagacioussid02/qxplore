import { useState, useCallback } from 'react';
import { circuitTttApi } from '../api/circuitTttApi';
import type { CircuitTTTGameState, GateType, CircuitCollapseResponse } from '../types/circuitTtt';

type CircuitTTTHook = {
  game: CircuitTTTGameState | null;
  selectedCells: number[];
  selectedGate: GateType;
  isLoading: boolean;
  error: string | null;
  lastCollapse: CircuitCollapseResponse | null;
  initGame: (vsAI?: boolean) => Promise<void>;
  selectGate: (g: GateType) => void;
  toggleCell: (idx: number) => void;
  submitMove: () => Promise<void>;
  triggerMeasure: () => Promise<void>;
  resetGame: () => void;
};

export function useCircuitTicTacToe(): CircuitTTTHook {
  const [game, setGame] = useState<CircuitTTTGameState | null>(null);
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [selectedGate, setSelectedGate] = useState<GateType>('X');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCollapse, setLastCollapse] = useState<CircuitCollapseResponse | null>(null);

  const initGame = useCallback(async (vsAI = true) => {
    setIsLoading(true);
    setError(null);
    setSelectedCells([]);
    setLastCollapse(null);
    setSelectedGate('X');
    try {
      const state = await circuitTttApi.newGame(vsAI);
      setGame(state);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? 'Failed to start a new game');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectGate = useCallback((g: GateType) => {
    setSelectedGate(g);
    setSelectedCells([]);
  }, []);

  const toggleCell = useCallback((idx: number) => {
    if (!game || game.phase === 'game_over' || game.measured) return;
    if (game.current_player !== 'X') return;

    // Prevent selecting already-touched cells
    const touched = new Set(game.moves.flatMap(m => m.cells));
    if (touched.has(idx)) return;

    setSelectedCells(prev => {
      const needed = selectedGate === 'CNOT' ? 2 : 1;
      if (prev.includes(idx)) return prev.filter(c => c !== idx);
      if (prev.length >= needed) return needed === 1 ? [idx] : [prev[1], idx];
      return [...prev, idx];
    });
  }, [game, selectedGate]);

  const submitMove = useCallback(async () => {
    if (!game) return;
    const needed = selectedGate === 'CNOT' ? 2 : 1;
    if (selectedCells.length !== needed) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await circuitTttApi.makeMove(
        game.game_id, 'X', selectedGate, selectedCells,
      );
      setGame(response.game_state);
      setSelectedCells([]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? 'Move failed');
    }
    setIsLoading(false);
  }, [game, selectedGate, selectedCells]);

  const triggerMeasure = useCallback(async () => {
    if (!game) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await circuitTttApi.measure(game.game_id);
      setGame(response.game_state);
      setLastCollapse(response);
      setSelectedCells([]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? 'Measurement failed');
    }
    setIsLoading(false);
  }, [game]);

  const resetGame = useCallback(() => {
    setGame(null);
    setSelectedCells([]);
    setError(null);
    setLastCollapse(null);
    setSelectedGate('X');
  }, []);

  return {
    game,
    selectedCells,
    selectedGate,
    isLoading,
    error,
    lastCollapse,
    initGame,
    selectGate,
    toggleCell,
    submitMove,
    triggerMeasure,
    resetGame,
  };
}
