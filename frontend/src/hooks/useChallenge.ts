import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { fetchChallenges, fetchChallenge, submitChallenge, fetchLeaderboard } from '../api/prepApi';
import type {
  ChallengeListItem, ChallengeDetail, GateInstruction, ScoringResult, LeaderboardEntry,
} from '../types/challenge';

function getApiErrorMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e)) {
    const detail = e.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    return e.message || fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function useChallengeList(category?: string, difficulty?: string) {
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    fetchChallenges(category, difficulty)
      .then(setChallenges)
      .catch(e => setError(getApiErrorMessage(e, 'Failed to load challenges')))
      .finally(() => setLoading(false));
  }, [category, difficulty]);

  return { challenges, loading, error };
}

export function useChallenge(slug: string, token?: string | null) {
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState<'hidden' | 'ok' | 'forbidden' | 'error'>('hidden');
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
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
  const handleLeaderboardError = useCallback((e: unknown) => {
    if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
      setLeaderboardStatus('forbidden');
      setLeaderboardError(null);
      return;
    }
    setLeaderboardStatus('error');
    setLeaderboardError(getApiErrorMessage(e, 'Unable to load leaderboard. Please try again.'));
  }, []);
  const resetTimerState = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTimerRunning(false);
    startTimeRef.current = null;
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    setError(null);
    setResult(null);
    resetTimerState();
    if (!slug) {
      setChallenge(null);
      setLeaderboard([]);
      setCanViewLeaderboard(false);
      setLeaderboardStatus('hidden');
      setLeaderboardError(null);
      setError('Missing challenge identifier');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLeaderboardError(null);

    fetchChallenge(slug, token ?? undefined)
      .then(async ch => {
        setChallenge(ch);
        if (!token) {
          setLeaderboard([]);
          setCanViewLeaderboard(false);
          setLeaderboardStatus('hidden');
          setLeaderboardError(null);
          return;
        }
        try {
          const lb = await fetchLeaderboard(slug, token);
          setLeaderboard(lb);
          setCanViewLeaderboard(true);
          setLeaderboardStatus('ok');
          setLeaderboardError(null);
        } catch (e: unknown) {
          setLeaderboard([]);
          setCanViewLeaderboard(false);
          handleLeaderboardError(e);
        }
      })
      .catch(e => {
        setChallenge(null);
        setLeaderboard([]);
        setCanViewLeaderboard(false);
        setLeaderboardStatus('hidden');
        setLeaderboardError(null);
        setError(getApiErrorMessage(e, 'Failed to load challenge'));
      })
      .finally(() => setLoading(false));
  }, [slug, token, resetTimerState, handleLeaderboardError]);

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
    resetTimerState();
  }, [resetTimerState]);

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
        fetchLeaderboard(slug, token)
          .then(lb => {
            setLeaderboard(lb);
            setCanViewLeaderboard(true);
            setLeaderboardStatus('ok');
            setLeaderboardError(null);
          })
          .catch((e: unknown) => {
            setLeaderboard([]);
            setCanViewLeaderboard(false);
            handleLeaderboardError(e);
          });
      }
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, 'Submission failed');
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [slug, token, elapsedSeconds, stopTimer, handleLeaderboardError]);

  const resetResult = useCallback(() => setResult(null), []);

  return {
    challenge, leaderboard, loading, error,
    canViewLeaderboard, leaderboardStatus, leaderboardError,
    elapsedSeconds, timerRunning, startTimer, stopTimer, resetTimer,
    result, submitting, submitError, submit, resetResult,
  };
}
