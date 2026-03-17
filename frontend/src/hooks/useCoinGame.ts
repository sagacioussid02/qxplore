import { useState, useCallback } from 'react';
import { quantumApi } from '../api/quantumApi';
import { useCreditStore } from '../store/creditStore';
import { useAuth } from './useAuth';
import type { CoinQuantumResult } from '../types/quantum';

type CoinPhase = 'idle' | 'flipping' | 'revealing' | 'done';

export const COIN_COST = 25;

export function useCoinGame() {
  const [phase, setPhase] = useState<CoinPhase>('idle');
  const [result, setResult] = useState<CoinQuantumResult | null>(null);
  const { credits: localCredits, deductCredits } = useCreditStore();
  const { isAuthenticated, accessToken } = useAuth();

  const betAmount = COIN_COST;
  const credits = localCredits;

  const flip = useCallback(async () => {
    if (phase === 'flipping') return;
    // Authenticated users: backend deducts server credits
    // Anonymous users: deduct from local store
    if (!isAuthenticated && !deductCredits(betAmount)) return;

    setPhase('flipping');
    setResult(null);

    const quantum = await quantumApi.flipCoin(isAuthenticated ? accessToken : null);
    setResult(quantum);
    setPhase('revealing');
  }, [phase, betAmount, deductCredits, isAuthenticated, accessToken]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
  }, []);

  return { phase, result, betAmount, credits, flip, reset };
}
