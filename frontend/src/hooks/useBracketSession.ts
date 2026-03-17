import { useState, useCallback, useRef } from 'react';
import { bracketApi } from '../api/bracketApi';
import { useBracketStore } from '../store/bracketStore';
import type { AgentName, BracketSSEEvent, BracketPick, TeamEntry } from '../types/bracket';
import { API_BASE } from '../api/client';

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
  const esRef = useRef<EventSource | null>(null);
  const evalEsRef = useRef<EventSource | null>(null);
  const anyCompleteRef = useRef(false);

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

  const cleanup = useCallback(() => {
    esRef.current?.close();
    evalEsRef.current?.close();
  }, []);

  return {
    loading, error, evaluationError, canResume, phase,
    restoreSession, startSession, startAllAgents, resumeAgents,
    startSingleAgent, completeAgentRandomly, runCommissioner, cleanup,
  };
}
