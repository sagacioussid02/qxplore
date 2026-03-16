import { apiClient, API_BASE } from './client';
import type { BracketData, AgentName } from '../types/bracket';

export interface SessionResponse {
  session_id: string;
  bracket: BracketData;
  source: string;
  is_anonymous: boolean;
  credits: number | null;
}

export const bracketApi = {
  createSession: (accessToken?: string): Promise<SessionResponse> =>
    apiClient.post(
      '/bracket/session',
      {},
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    ).then(r => r.data),

  getMySession: (accessToken: string): Promise<SessionResponse & { status: string; completed_brackets: Record<string, unknown>; evaluation: unknown }> =>
    apiClient.get(
      '/bracket/session/mine',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ).then(r => r.data),

  getSession: (sessionId: string) =>
    apiClient.get(`/bracket/session/${sessionId}`).then(r => r.data),

  getConsensus: (sessionId: string) =>
    apiClient.get(`/bracket/session/${sessionId}/consensus`).then(r => r.data),

  agentStreamUrl: (sessionId: string, agent: AgentName) =>
    `${API_BASE}/bracket/session/${sessionId}/agent/${agent}/stream`,

  allAgentsStreamUrl: (sessionId: string) =>
    `${API_BASE}/bracket/session/${sessionId}/all-agents/stream`,

  evaluateStreamUrl: (sessionId: string) =>
    `${API_BASE}/bracket/session/${sessionId}/evaluate/stream`,
};
