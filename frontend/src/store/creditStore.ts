import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CreditStore {
  credits: number;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => boolean;
  resetCredits: () => void;
}

export const useCreditStore = create<CreditStore>()(
  persist(
    (set, get) => ({
      credits: 510,
      addCredits: (amount) => set((s) => ({ credits: s.credits + amount })),
      deductCredits: (amount) => {
        if (get().credits < amount) return false;
        set((s) => ({ credits: s.credits - amount }));
        return true;
      },
      resetCredits: () => set({ credits: 510 }),
    }),
    { name: 'quantum-credits' }
  )
);
