import { apiClient } from './client';
import type {
  TemplateInfo, BenchmarkResult, BenchmarkRunSummary, TemplateName,
} from '../types/benchmark';

function authHeaders(token?: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTemplates(): Promise<TemplateInfo[]> {
  const { data } = await apiClient.get('/benchmark/templates');
  return data;
}

export async function runBenchmark(
  template: TemplateName,
  parameters: Record<string, unknown>,
  token?: string | null,
): Promise<BenchmarkResult> {
  const { data } = await apiClient.post(
    '/benchmark/run',
    { template, parameters },
    { headers: authHeaders(token) },
  );
  return data;
}

export async function fetchRuns(token: string): Promise<BenchmarkRunSummary[]> {
  const { data } = await apiClient.get('/benchmark/runs', {
    headers: authHeaders(token),
  });
  return data;
}

export async function fetchRun(id: string, token: string): Promise<BenchmarkResult> {
  const { data } = await apiClient.get(`/benchmark/runs/${id}`, {
    headers: authHeaders(token),
  });
  return data;
}

export async function deleteRun(id: string, token: string): Promise<void> {
  await apiClient.delete(`/benchmark/runs/${id}`, {
    headers: authHeaders(token),
  });
}
