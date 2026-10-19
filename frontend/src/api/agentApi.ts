import { API_BASE } from './client';
import type { TutorContext, GameMasterEvent } from '../types/agents';

/**
 * Appends the Supabase access token as ?token=.
 * EventSource cannot set request headers, so the SSE endpoints accept the
 * token via query param (see backend/core/supabase_auth.py). The /agents/*
 * endpoints require authentication and deduct credits.
 */
function authParam(token?: string | null): string {
  return token ? `&token=${encodeURIComponent(token)}` : '';
}

export const agentApi = {
  tutorStreamUrl: (ctx: TutorContext, token?: string | null) =>
    `${API_BASE}/agents/tutor/stream?context=${encodeURIComponent(JSON.stringify(ctx))}${authParam(token)}`,

  gameMasterStreamUrl: (evt: GameMasterEvent, token?: string | null) =>
    `${API_BASE}/agents/game-master/stream?event=${encodeURIComponent(JSON.stringify(evt))}${authParam(token)}`,

  conceptQAStreamUrl: (sessionId: string, message: string, history: { role: string; content: string }[], token?: string | null) =>
    `${API_BASE}/agents/concept-qa/stream?request=${encodeURIComponent(
      JSON.stringify({ session_id: sessionId, message, history })
    )}${authParam(token)}`,
};
