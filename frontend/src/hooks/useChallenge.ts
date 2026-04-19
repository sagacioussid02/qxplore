import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchChallenges, fetchChallenge, submitChallenge, fetchLeaderboard } from '../api/prepApi';
import type {
  ChallengeListItem, ChallengeDetail, GateInstruction, ScoringResult, LeaderboardEntry,
} from '../types/challenge';

export function useChallengeList(category?: string, difficulty?: string) {
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    fetchChallenges(category, difficulty)
      .then(setChallenges)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, difficulty]);

  return { challenges, loading, error };
}

export function useChallenge(slug: string, token?: string | null) {
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Submission state
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [canViewLeaderboard, setCanViewLeaderboard] = useState(false);

  useEffect(() => {
    setError(null);
    setResult(null);
    if (!slug) {
      setChallenge(null);
      setLeaderboard([]);
      setCanViewLeaderboard(false);
      setError('Missing challenge identifier');
      setLoading(false);
      return;
    }
    setLoading(true);

    fetchChallenge(slug, token ?? undefined)
      .then(async ch => {
        setChallenge(ch);
        if (!token) {
          setLeaderboard([]);
          setCanViewLeaderboard(false);
          return;
        }
        try {
          const lb = await fetchLeaderboard(slug, token);
          setLeaderboard(lb);
          setCanViewLeaderboard(true);
        } catch {
          setLeaderboard([]);
          setCanViewLeaderboard(false);
        }
      })
      .catch(e => {
        setChallenge(null);
        setLeaderboard([]);
        setCanViewLeaderboard(false);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [slug, token]);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    setTimerRunning(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = null;
    setElapsedSeconds(0);
  }, [stopTimer]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const submit = useCallback(async (gates: GateInstruction[]) => {
    if (!token) { setSubmitError('Login required to submit'); return; }
    stopTimer();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitChallenge(slug, gates, elapsedSeconds, token);
      setResult(res);
      // refresh leaderboard after pass
      if (res.passed) {
        fetchLeaderboard(slug, token).then(setLeaderboard).catch(() => null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [slug, token, elapsedSeconds, stopTimer]);

  const resetResult = useCallback(() => setResult(null), []);

  return {
    challenge, leaderboard, loading, error,
    canViewLeaderboard,
    elapsedSeconds, timerRunning, startTimer, stopTimer, resetTimer,
    result, submitting, submitError, submit, resetResult,
  };
}
