import { useState, useCallback } from 'react';
import { quantumApi } from '../api/quantumApi';
import { useCreditStore } from '../store/creditStore';
import type { CoinQuantumResult } from '../types/quantum';

type CoinPhase = 'idle' | 'flipping' | 'revealing' | 'done';

export function useCoinGame() {
  const [phase, setPhase] = useState<CoinPhase>('idle');
  const [result, setResult] = useState<CoinQuantumResult | null>(null);
  const [betAmount] = useState(10);
  const { credits, deductCredits } = useCreditStore();

  const flip = useCallback(async () => {
    if (phase === 'flipping') return;
    if (!deductCredits(betAmount)) return;

    setPhase('flipping');
    setResult(null);

    const quantum = await quantumApi.flipCoin();
    setResult(quantum);
    setPhase('revealing');
  }, [phase, betAmount, deductCredits]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
  }, []);

  return { phase, result, betAmount, credits, flip, reset };
}
