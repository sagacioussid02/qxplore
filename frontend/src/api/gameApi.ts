import { apiClient } from './client';
import type { TTTGameState, MoveResponse } from '../types/games';

export const gameApi = {
  newTTTGame: (vs_ai = true) =>
    apiClient.post<TTTGameState>('/games/ttt/new', null, { params: { vs_ai } }).then(r => r.data),

  getTTTGame: (game_id: string) =>
    apiClient.get<TTTGameState>(`/games/ttt/${game_id}`).then(r => r.data),

  makeTTTMove: (game_id: string, player: 'X' | 'O', cells: number[]) =>
    apiClient
      .post<MoveResponse>(`/games/ttt/${game_id}/move`, { player, cells })
      .then(r => r.data),

  resetTTTGame: (game_id: string) =>
    apiClient.delete(`/games/ttt/${game_id}`).then(r => r.data),
};
