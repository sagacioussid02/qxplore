import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface AuthState {
  session: Session | null;
  user: User | null;
  credits: number | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    credits: null,
    loading: true,
  });

  const fetchCredits = useCallback(async (session: Session) => {
    try {
      const { data } = await axios.get(`${API}/stripe/credits`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setState(s => ({ ...s, credits: data.credits }));
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, session, user: session?.user ?? null, loading: false }));
      if (session) fetchCredits(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }));
      if (session) fetchCredits(session);
      else setState(s => ({ ...s, credits: null }));
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const refreshCredits = useCallback(() => {
    if (state.session) fetchCredits(state.session);
  }, [state.session, fetchCredits]);

  const startStripeCheckout = useCallback(async () => {
    if (!state.session) return;
    try {
      const { data } = await axios.post(
        `${API}/stripe/checkout`,
        {},
        { headers: { Authorization: `Bearer ${state.session.access_token}` } },
      );
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail ?? err.message)
        : 'Checkout failed';
      alert(`Could not start checkout: ${msg}`);
    }
  }, [state.session]);

  return {
    ...state,
    isAuthenticated: !!state.user,
    accessToken: state.session?.access_token ?? null,
    signOut,
    refreshCredits,
    startStripeCheckout,
  };
}
