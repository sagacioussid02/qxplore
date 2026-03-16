import { API_BASE } from './client';
import type { TutorContext, GameMasterEvent } from '../types/agents';

export const agentApi = {
  tutorStreamUrl: (ctx: TutorContext) =>
    `${API_BASE}/agents/tutor/stream?context=${encodeURIComponent(JSON.stringify(ctx))}`,

  gameMasterStreamUrl: (evt: GameMasterEvent) =>
    `${API_BASE}/agents/game-master/stream?event=${encodeURIComponent(JSON.stringify(evt))}`,

  conceptQAStreamUrl: (sessionId: string, message: string, history: { role: string; content: string }[]) =>
    `${API_BASE}/agents/concept-qa/stream?request=${encodeURIComponent(
      JSON.stringify({ session_id: sessionId, message, history })
    )}`,
};
