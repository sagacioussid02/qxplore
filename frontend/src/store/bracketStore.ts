import { create } from 'zustand';
import type {
  BracketData, AgentName, BracketPick,
  TeamEntry, AgentStatus, EvaluationResult,
} from '../types/bracket';

// ── localStorage cache ────────────────────────────────────────────────────
const CACHE_KEY = 'bracket_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  timestamp: number;
  agents: Record<AgentName, { picks: Record<string, BracketPick>; champion: TeamEntry | null; pickCount: number }>;
  evaluationText: string;
  evaluationDone: boolean;
  allComplete: boolean;
}

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function saveCache(state: Pick<BracketStore, 'agents' | 'evaluationText' | 'evaluationDone' | 'allComplete'>) {
  try {
    const entry: CacheEntry = {
      timestamp: Date.now(),
      agents: Object.fromEntries(
        (Object.entries(state.agents) as [AgentName, AgentState][]).map(([name, a]) => [
          name,
          { picks: a.picks, champion: a.champion, pickCount: a.pickCount },
        ])
      ) as Record<AgentName, { picks: Record<string, BracketPick>; champion: TeamEntry | null; pickCount: number }>,
      evaluationText: state.evaluationText,
      evaluationDone: state.evaluationDone,
      allComplete: state.allComplete,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // storage quota or unavailable — ignore
  }
}

interface AgentState {
  status: AgentStatus;
  picks: Record<string, BracketPick>;    // keyed by game_id
  champion: TeamEntry | null;
  liveReasoning: string;                  // latest reasoning chunk
  pickCount: number;
}

interface BracketStore {
  sessionId: string | null;
  bracket: BracketData | null;
  isAnonymous: boolean;
  credits: number | null;
  agents: Record<AgentName, AgentState>;
  activeTab: AgentName;
  evaluationText: string;
  evaluationDone: boolean;
  evaluation: EvaluationResult | null;
  allComplete: boolean;
  showScoreboard: boolean;

  // Actions
  initSession: (sessionId: string, bracket: BracketData) => void;
  setIsAnonymous: (val: boolean) => void;
  setCredits: (val: number) => void;
  applyPick: (agent: AgentName, gameId: string, pick: Omit<BracketPick, 'session_id' | 'agent'> & { session_id: string }) => void;
  setAgentStatus: (agent: AgentName, status: AgentStatus) => void;
  setAgentComplete: (agent: AgentName, champion: TeamEntry | null, picks: Record<string, BracketPick>) => void;
  setLiveReasoning: (agent: AgentName, text: string) => void;
  appendEvaluationChunk: (chunk: string) => void;
  setEvaluationDone: () => void;
  setActiveTab: (agent: AgentName) => void;
  setAllComplete: () => void;
  setShowScoreboard: (show: boolean) => void;
  reset: () => void;
}

const makeInitialAgentState = (): AgentState => ({
  status: 'idle',
  picks: {},
  champion: null,
  liveReasoning: '',
  pickCount: 0,
});

const AGENTS: AgentName[] = ['claude', 'openai', 'gemini', 'montecarlo', 'quantum'];

const initialAgents = (): Record<AgentName, AgentState> =>
  Object.fromEntries(AGENTS.map(a => [a, makeInitialAgentState()])) as Record<AgentName, AgentState>;

export const useBracketStore = create<BracketStore>((set) => ({
  sessionId: null,
  bracket: null,
  isAnonymous: true,
  credits: null,
  agents: initialAgents(),
  activeTab: 'claude',
  evaluationText: '',
  evaluationDone: false,
  evaluation: null,
  allComplete: false,
  showScoreboard: false,

  initSession: (sessionId, bracket) => {
    const cache = loadCache();
    if (cache) {
      // Restore cached agent picks (mark completed agents as 'complete')
      const restoredAgents = initialAgents();
      for (const [name, cached] of Object.entries(cache.agents) as [AgentName, CacheEntry['agents'][AgentName]][]) {
        if (cached.pickCount > 0) {
          restoredAgents[name] = {
            ...restoredAgents[name],
            picks: cached.picks,
            champion: cached.champion,
            pickCount: cached.pickCount,
            status: 'complete',
          };
        }
      }
      set({
        sessionId,
        bracket,
        agents: restoredAgents,
        evaluationText: cache.evaluationText,
        evaluationDone: cache.evaluationDone,
        evaluation: null,
        allComplete: cache.allComplete,
        showScoreboard: cache.evaluationDone,
      });
    } else {
      set({
        sessionId,
        bracket,
        agents: initialAgents(),
        evaluationText: '',
        evaluationDone: false,
        evaluation: null,
        allComplete: false,
        showScoreboard: false,
      });
    }
  },

  setIsAnonymous: (val) => set({ isAnonymous: val }),

  setCredits: (val) => set({ credits: val }),

  applyPick: (agent, gameId, pick) => set(state => {
    const agentState = state.agents[agent];
    const isNew = !(gameId in agentState.picks);
    return {
      agents: {
        ...state.agents,
        [agent]: {
          ...agentState,
          picks: { ...agentState.picks, [gameId]: pick as BracketPick },
          liveReasoning: pick.reasoning || agentState.liveReasoning,
          pickCount: isNew ? agentState.pickCount + 1 : agentState.pickCount,
        },
      },
    };
  }),

  setAgentStatus: (agent, status) => set(state => ({
    agents: { ...state.agents, [agent]: { ...state.agents[agent], status } },
  })),

  setAgentComplete: (agent, champion, picks) => set(state => {
    const next = {
      agents: {
        ...state.agents,
        [agent]: {
          ...state.agents[agent],
          status: 'complete' as AgentStatus,
          champion,
          picks,
          pickCount: Object.keys(picks).length,
        },
      },
    };
    saveCache({ ...state, ...next });
    return next;
  }),

  setLiveReasoning: (agent, text) => set(state => ({
    agents: { ...state.agents, [agent]: { ...state.agents[agent], liveReasoning: text } },
  })),

  appendEvaluationChunk: (chunk) => set(state => ({
    evaluationText: state.evaluationText + chunk,
  })),

  setEvaluationDone: () => set(state => {
    const next = { evaluationDone: true, showScoreboard: true };
    saveCache({ ...state, ...next });
    return next;
  }),

  setActiveTab: (agent) => set({ activeTab: agent }),

  setAllComplete: () => set(state => {
    const next = { allComplete: true };
    saveCache({ ...state, ...next });
    return next;
  }),

  setShowScoreboard: (show) => set({ showScoreboard: show }),

  reset: () => {
    localStorage.removeItem(CACHE_KEY);
    set({
      sessionId: null,
      bracket: null,
      isAnonymous: true,
      credits: null,
      agents: initialAgents(),
      evaluationText: '',
      evaluationDone: false,
      evaluation: null,
      allComplete: false,
      showScoreboard: false,
    });
  },
}));
