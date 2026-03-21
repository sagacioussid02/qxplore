import { useState, useCallback, useRef } from 'react';
import { bracketApi } from '../api/bracketApi';
import { useBracketStore } from '../store/bracketStore';
import type { AgentName, BracketSSEEvent, BracketPick, TeamEntry } from '../types/bracket';
import { API_BASE } from '../api/client';
import { generateAllDemoPicks, DEMO_EVALUATION_TEXT } from '../data/demoBracketPicks';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Per-agent pick delay (ms) — stagger so agents complete at different times
const AGENT_PICK_DELAY: Record<AgentName, number> = {
  montecarlo: 60,
  openai:     75,
  gemini:     88,
  claude:     95,
  quantum:    110,
};

const AGENTS: AgentName[] = ['claude', 'openai', 'gemini', 'montecarlo', 'quantum'];

interface UseBracketSessionOptions {
  accessToken?: string | null;
  onCreditsUpdate?: (remaining: number) => void;
}

export function useBracketSession({ accessToken, onCreditsUpdate }: UseBracketSessionOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'picking' | 'evaluating' | 'done'>('idle');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const evalEsRef = useRef<EventSource | null>(null);
  const anyCompleteRef = useRef(false);
  const demoAbortRef = useRef(false);

  const store = useBracketStore();

  const restoreSession = useCallback(async (): Promise<boolean> => {
    if (!accessToken) return false;
    try {
      const result = await bracketApi.getMySession(accessToken);
      store.initSession(result.session_id, result.bracket);
      store.setIsAnonymous(false);
      if (result.credits !== undefined && result.credits !== null) {
        store.setCredits(result.credits);
      }
      for (const [agentName, cb] of Object.entries(result.completed_brackets ?? {})) {
        const b = cb as { picks: Record<string, BracketPick>; champion: TeamEntry | null };
        store.setAgentComplete(agentName as AgentName, b.champion, b.picks);
      }
      const evalText = (result.evaluation as { written_analysis?: string } | null)?.written_analysis;
      if (evalText) {
        store.appendEvaluationChunk(evalText);
        store.setEvaluationDone();
        store.setAllComplete();
      }
      if (result.status === 'complete') setPhase('done');
      else if (result.status === 'evaluating') setPhase('evaluating');
      return true;
    } catch {
      return false;
    }
  }, [store, accessToken]);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await bracketApi.createSession(accessToken ?? undefined);
      store.initSession(result.session_id, result.bracket);
      store.setIsAnonymous(result.is_anonymous ?? true);
      if (result.credits !== undefined && result.credits !== null) {
        store.setCredits(result.credits);
      }
      setPhase('idle');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }, [store, accessToken]);

  // Defined first so connectAgentStream and runCommissioner can safely reference it
  const startEvaluation = useCallback((sessionId: string) => {
    setEvaluationError(null);
    evalEsRef.current?.close();
    const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const url = `${API_BASE}/bracket/session/${sessionId}/evaluate/stream${tokenParam}`;
    const es = new EventSource(url);
    evalEsRef.current = es;

    let receivedEvalData = false;

    es.onmessage = (e) => {
      receivedEvalData = true;
      try {
        const event = JSON.parse(e.data) as BracketSSEEvent;
        if (event.type === 'evaluation_chunk') {
          if (!event.done && event.chunk) {
            store.appendEvaluationChunk(event.chunk);
          } else if (event.done) {
            store.setEvaluationDone();
            es.close();
            setPhase('done');
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      if (!receivedEvalData) {
        // Connection failed before any data — backend error or session not found
        setEvaluationError('Commissioner failed to start. Try again or reload the bracket.');
        setPhase('idle');
      } else {
        // Stream cut mid-way — mark done with whatever we got
        store.setEvaluationDone();
        setPhase('done');
      }
    };
  }, [store, accessToken]);

  const connectAgentStream = useCallback((sessionId: string, resumeMode = false) => {
    esRef.current?.close();
    anyCompleteRef.current = false;

    AGENTS.forEach(a => {
      const s = useBracketStore.getState().agents[a];
      if (resumeMode && s.status === 'complete') return;
      store.resetAgentPicks(a);
      store.setAgentStatus(a, 'running');
    });
    setPhase('picking');
    setError(null);
    setCanResume(false);

    const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const url = `${API_BASE}/bracket/session/${sessionId}/all-agents/stream${tokenParam}`;
    const es = new EventSource(url);
    esRef.current = es;

    let receivedAnyMessage = false;

    es.onmessage = (e) => {
      receivedAnyMessage = true;
      try {
        const event = JSON.parse(e.data) as BracketSSEEvent;

        if (event.type === 'pick') {
          store.applyPick(event.agent, event.game_id, {
            session_id: sessionId,
            game_id: event.game_id,
            winner_team_id: event.winner_team_id,
            winner_name: event.winner_name,
            confidence: event.confidence,
            reasoning: event.reasoning,
            pick_metadata: event.circuit ?? event.sim_data ?? {},
          });
        } else if (event.type === 'agent_complete') {
          anyCompleteRef.current = true;
          store.setAgentComplete(
            event.agent,
            event.champion as TeamEntry | null,
            event.picks as Record<string, BracketPick>,
          );
        } else if (event.type === 'agent_done') {
          store.setAgentStatus(event.agent, 'complete');
        } else if (event.type === 'all_agents_complete') {
          if (event.credits_remaining !== undefined && event.credits_remaining !== null) {
            store.setCredits(event.credits_remaining);
            onCreditsUpdate?.(event.credits_remaining);
          }
          store.setAllComplete();
          es.close();
          setPhase('evaluating');
          startEvaluation(sessionId);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      const state = useBracketStore.getState();
      const hasRunningAgents = AGENTS.some(a => state.agents[a].status === 'running');

      AGENTS.forEach(a => {
        if (state.agents[a].status === 'running') store.setAgentStatus(a, 'error');
      });

      if (receivedAnyMessage && hasRunningAgents) {
        setError('Connection timed out. Some agents did not finish.');
        setCanResume(true);
      } else {
        setError('Could not start agents. Check credits or try reloading the bracket.');
        setCanResume(false);
      }
      setPhase('idle');
    };
  }, [store, accessToken, onCreditsUpdate, startEvaluation]);

  // Single-agent stream — for per-agent resume buttons
  const startSingleAgent = useCallback((agentName: AgentName) => {
    const { sessionId } = useBracketStore.getState();
    if (!sessionId) return;

    store.resetAgentPicks(agentName);
    store.setAgentStatus(agentName, 'running');

    const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const url = `${API_BASE}/bracket/session/${sessionId}/agent/${agentName}/stream${tokenParam}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as BracketSSEEvent;
        if (event.type === 'pick') {
          store.applyPick(agentName, event.game_id, {
            session_id: sessionId,
            game_id: event.game_id,
            winner_team_id: event.winner_team_id,
            winner_name: event.winner_name,
            confidence: event.confidence,
            reasoning: event.reasoning,
            pick_metadata: event.circuit ?? event.sim_data ?? {},
          });
        } else if (event.type === 'agent_complete') {
          store.setAgentComplete(
            agentName,
            event.champion as TeamEntry | null,
            event.picks as Record<string, BracketPick>,
          );
        } else if (event.type === 'stream_done') {
          es.close();
          store.setAgentStatus(agentName, 'complete');
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
      store.setAgentStatus(agentName, 'error');
    };
  }, [store, accessToken]);

  const completeAgentRandomly = useCallback((agentName: AgentName) => {
    const { sessionId } = useBracketStore.getState();
    if (!sessionId) return;

    store.setAgentStatus(agentName, 'running');

    const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const url = `${API_BASE}/bracket/session/${sessionId}/agent/${agentName}/complete-randomly${tokenParam}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as BracketSSEEvent;
        if (event.type === 'pick') {
          store.applyPick(agentName, event.game_id, {
            session_id: sessionId,
            game_id: event.game_id,
            winner_team_id: event.winner_team_id,
            winner_name: event.winner_name,
            confidence: event.confidence,
            reasoning: event.reasoning,
            pick_metadata: {},
          });
        } else if (event.type === 'agent_complete') {
          store.setAgentComplete(
            agentName,
            event.champion as TeamEntry | null,
            event.picks as Record<string, BracketPick>,
          );
        } else if (event.type === 'stream_done') {
          es.close();
          store.setAgentStatus(agentName, 'complete');
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
      store.setAgentStatus(agentName, 'error');
    };
  }, [store, accessToken]);

  const startAllAgents = useCallback(() => {
    const { sessionId } = useBracketStore.getState();
    if (!sessionId) return;
    connectAgentStream(sessionId);
  }, [connectAgentStream]);

  const resumeAgents = useCallback(() => {
    const { sessionId } = useBracketStore.getState();
    if (!sessionId) return;
    connectAgentStream(sessionId, true);
  }, [connectAgentStream]);

  const runCommissioner = useCallback(() => {
    const { sessionId } = useBracketStore.getState();
    if (!sessionId) return;
    setPhase('evaluating');
    startEvaluation(sessionId);
  }, [startEvaluation]);

  const startDemoAgents = useCallback(async () => {
    const { sessionId, bracket } = useBracketStore.getState();
    if (!sessionId || !bracket) return;

    demoAbortRef.current = false;
    setIsDemoMode(true);
    setPhase('picking');
    setError(null);
    setEvaluationError(null);
    setCanResume(false);
    store.resetEvaluation();

    AGENTS.forEach(a => {
      store.resetAgentPicks(a);
      store.setAgentStatus(a, 'running');
    });

    const { picks: demoPicks, champions: demoChampions } = generateAllDemoPicks(bracket);

    // Stream picks for all agents concurrently, each at its own pace
    await Promise.all(
      AGENTS.map(async (agent) => {
        const pickDelay = AGENT_PICK_DELAY[agent];
        const agentPicks = demoPicks[agent];

        for (const [gameId, pick] of Object.entries(agentPicks)) {
          if (demoAbortRef.current) return;
          await delay(pickDelay);
          if (demoAbortRef.current) return;
          store.applyPick(agent, gameId, {
            session_id: sessionId,
            ...pick,
          });
        }

        if (demoAbortRef.current) return;

        // Build full BracketPick record for setAgentComplete
        const fullPicks = Object.fromEntries(
          Object.entries(agentPicks).map(([id, p]) => [
            id,
            { ...p, session_id: sessionId, agent } as BracketPick,
          ]),
        ) as Record<string, BracketPick>;

        store.setAgentComplete(agent, demoChampions[agent], fullPicks);
        store.setAgentStatus(agent, 'complete');
      }),
    );

    if (demoAbortRef.current) return;

    store.setAllComplete();
    setPhase('evaluating');

    // Stream demo evaluation text in small chunks to mimic LLM output
    const CHUNK = 10;
    for (let i = 0; i < DEMO_EVALUATION_TEXT.length; i += CHUNK) {
      if (demoAbortRef.current) return;
      await delay(18);
      if (demoAbortRef.current) return;
      store.appendEvaluationChunk(DEMO_EVALUATION_TEXT.slice(i, i + CHUNK));
    }
    store.setEvaluationDone();
    setPhase('done');
  }, [store]);

  const cleanup = useCallback(() => {
    demoAbortRef.current = true;
    esRef.current?.close();
    evalEsRef.current?.close();
  }, []);

  return {
    loading, error, evaluationError, canResume, phase, isDemoMode,
    restoreSession, startSession, startAllAgents, startDemoAgents, resumeAgents,
    startSingleAgent, completeAgentRandomly, runCommissioner, cleanup,
  };
}
