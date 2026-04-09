import { apiClient } from './client';
import type {
  CircuitTTTGameState,
  CircuitMoveResponse,
  CircuitCollapseResponse,
  GateType,
} from '../types/circuitTtt';

export const circuitTttApi = {
  newGame: (vs_ai = true) =>
    apiClient
      .post<CircuitTTTGameState>('/circuit-ttt/new', null, { params: { vs_ai } })
      .then(r => r.data),

  getGame: (game_id: string) =>
    apiClient.get<CircuitTTTGameState>(`/circuit-ttt/${game_id}`).then(r => r.data),

  makeMove: (game_id: string, player: 'X' | 'O', gate: GateType, cells: number[]) =>
    apiClient
      .post<CircuitMoveResponse>(`/circuit-ttt/${game_id}/move`, { player, gate, cells })
      .then(r => r.data),

  measure: (game_id: string) =>
    apiClient
      .post<CircuitCollapseResponse>(`/circuit-ttt/${game_id}/measure`)
      .then(r => r.data),

  deleteGame: (game_id: string) =>
    apiClient.delete(`/circuit-ttt/${game_id}`).then(r => r.data),
};
