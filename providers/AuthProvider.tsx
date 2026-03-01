import React, { createContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Client, ClientMetrics, Checkin } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  client: Client | null;
  metrics: ClientMetrics | null;
  recentCheckins: Checkin[];
  loading: boolean;
  clientError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshClientData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  client: null,
  metrics: null,
  recentCheckins: [],
  loading: true,
  clientError: null,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshClientData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const fetchClientData = useCallback(async () => {
    try {
      setClientError(null);
      const data = await api.get<{
        client: Client;
        metrics: ClientMetrics | null;
        recentCheckins: Checkin[];
      }>('/api/client/me');
      setClient(data.client);
      setMetrics(data.metrics);
      setRecentCheckins(data.recentCheckins);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Failed to fetch client data:', message);
      setClientError(message);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s) fetchClientData();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s) fetchClientData();
        else {
          setClient(null);
          setMetrics(null);
          setRecentCheckins([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchClientData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setClient(null);
    setMetrics(null);
    setRecentCheckins([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        client,
        metrics,
        recentCheckins,
        loading,
        clientError,
        signIn,
        signOut,
        refreshClientData: fetchClientData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
