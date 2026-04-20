import { apiClient } from './client';
import type {
  ChallengeListItem, ChallengeDetail, GateInstruction,
  ScoringResult, LeaderboardEntry, UserSubmission,
} from '../types/challenge';

function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchChallenges(
  category?: string,
  difficulty?: string,
): Promise<ChallengeListItem[]> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (difficulty) params.difficulty = difficulty;
  const { data } = await apiClient.get('/prep/challenges', { params });
  return data;
}

export async function fetchChallenge(
  slug: string,
  token?: string,
): Promise<ChallengeDetail> {
  const { data } = await apiClient.get(`/prep/challenges/${slug}`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function submitChallenge(
  slug: string,
  gates: GateInstruction[],
  timeTakenS: number,
  token: string,
): Promise<ScoringResult> {
  const { data } = await apiClient.post(
    `/prep/challenges/${slug}/submit`,
    { gates, time_taken_s: timeTakenS },
    { headers: authHeaders(token) },
  );
  return data;
}

export async function fetchLeaderboard(slug: string, token: string): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get(`/prep/leaderboard/${slug}`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function fetchMySubmissions(token: string): Promise<UserSubmission[]> {
  const { data } = await apiClient.get('/prep/my-submissions', {
    headers: authHeaders(token),
  });
  return data;
}
