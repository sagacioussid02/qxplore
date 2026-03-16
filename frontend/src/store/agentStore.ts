import { create } from 'zustand';
import type { AgentMessage } from '../types/agents';

interface AgentStore {
  tutorText: string;
  isTutorStreaming: boolean;
  gameMasterText: string;
  isGameMasterStreaming: boolean;
  conceptHistory: AgentMessage[];
  isConceptStreaming: boolean;

  appendTutor: (chunk: string) => void;
  setTutorStreaming: (v: boolean) => void;
  clearTutor: () => void;

  appendGameMaster: (chunk: string) => void;
  setGameMasterStreaming: (v: boolean) => void;
  clearGameMaster: () => void;

  appendConceptChunk: (chunk: string) => void;
  pushConceptMessage: (msg: AgentMessage) => void;
  setConceptStreaming: (v: boolean) => void;
  clearConcept: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  tutorText: '',
  isTutorStreaming: false,
  gameMasterText: '',
  isGameMasterStreaming: false,
  conceptHistory: [],
  isConceptStreaming: false,

  appendTutor: (chunk) => set((s) => ({ tutorText: s.tutorText + chunk })),
  setTutorStreaming: (v) => set({ isTutorStreaming: v }),
  clearTutor: () => set({ tutorText: '', isTutorStreaming: false }),

  appendGameMaster: (chunk) => set((s) => ({ gameMasterText: s.gameMasterText + chunk })),
  setGameMasterStreaming: (v) => set({ isGameMasterStreaming: v }),
  clearGameMaster: () => set({ gameMasterText: '', isGameMasterStreaming: false }),

  appendConceptChunk: (chunk) =>
    set((s) => {
      const history = [...s.conceptHistory];
      if (history.length > 0 && history[history.length - 1].role === 'assistant') {
        history[history.length - 1] = {
          ...history[history.length - 1],
          content: history[history.length - 1].content + chunk,
        };
      } else {
        history.push({ role: 'assistant', content: chunk });
      }
      return { conceptHistory: history };
    }),
  pushConceptMessage: (msg) =>
    set((s) => ({ conceptHistory: [...s.conceptHistory, msg] })),
  setConceptStreaming: (v) => set({ isConceptStreaming: v }),
  clearConcept: () => set({ conceptHistory: [], isConceptStreaming: false }),
}));
