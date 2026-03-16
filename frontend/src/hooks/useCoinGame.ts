import { useState, useCallback } from 'react';
import { quantumApi } from '../api/quantumApi';
import { useCreditStore } from '../store/creditStore';
import type { CoinQuantumResult } from '../types/quantum';

type CoinPhase = 'idle' | 'flipping' | 'revealing' | 'done';

export function useCoinGame() {
  const [phase, setPhase] = useState<CoinPhase>('idle');
  const [result, setResult] = useState<CoinQuantumResult | null>(null);
  const [betAmount] = useState(10);
  const { credits, deductCredits, addCredits } = useCreditStore();

  const flip = useCallback(async () => {
    if (phase === 'flipping') return;
    if (!deductCredits(betAmount)) return;

    setPhase('flipping');
    setResult(null);

    const quantum = await quantumApi.flipCoin();
    setResult(quantum);
    setPhase('revealing');

    // Payout: heads doubles, tails loses
    if (quantum.result === 0) {
      addCredits(betAmount * 2);
    }
  }, [phase, betAmount, deductCredits, addCredits]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
  }, []);

  return { phase, result, betAmount, credits, flip, reset };
}
