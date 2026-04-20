import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { fetchTemplates, runBenchmark, fetchRuns, deleteRun } from '../api/benchmarkApi';
import type { TemplateInfo, BenchmarkResult, BenchmarkRunSummary, TemplateName } from '../types/benchmark';

function apiError(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data?.detail;
    if (typeof d === 'string' && d.trim()) return d;
    return e.message || fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(e => setError(apiError(e, 'Failed to load templates')))
      .finally(() => setLoading(false));
  }, []);

  return { templates, loading, error };
}

export function useBenchmark(token?: string | null) {
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (template: TemplateName, parameters: Record<string, unknown>) => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await runBenchmark(template, parameters, token);
      setResult(r);
      return r;
    } catch (e) {
      setError(apiError(e, 'Benchmark failed'));
      return null;
    } finally {
      setRunning(false);
    }
  }, [token]);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, running, error, run, reset };
}

export function useRunHistory(token?: string | null) {
  const [runs, setRuns] = useState<BenchmarkRunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchRuns(token);
      setRuns(data);
    } catch (e) {
      setError(apiError(e, 'Failed to load run history'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const remove = useCallback(async (id: string) => {
    if (!token) return false;
    setError(null);
    try {
      await deleteRun(id, token);
      setRuns(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (e) {
      setError(apiError(e, 'Failed to delete run'));
      return false;
    }
  }, [token]);

  return { runs, loading, error, reload: load, remove };
}
