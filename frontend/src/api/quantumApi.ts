import { apiClient } from './client';
import type { CoinQuantumResult, RouletteQuantumResult } from '../types/quantum';

export const quantumApi = {
  flipCoin: (accessToken?: string | null) =>
    apiClient
      .post<CoinQuantumResult>('/quantum/coin', null, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      .then(r => r.data),
  spinRoulette: (n_qubits = 6) =>
    apiClient.post<RouletteQuantumResult>('/quantum/roulette', { n_qubits }).then(r => r.data),
};
