import React, { createContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Client, ClientMetrics, Checkin, StreakData, EarnedBadge, BadgeDefinition, UserRole } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  client: Client | null;
  userRole: UserRole;
  isAdmin: boolean;
  organizationId: string | null;
  metrics: ClientMetrics | null;
  recentCheckins: Checkin[];
  streak: StreakData | null;
  earnedBadges: EarnedBadge[];
  allBadges: BadgeDefinition[];
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
  userRole: null,
  isAdmin: false,
  organizationId: null,
  metrics: null,
  recentCheckins: [],
  streak: null,
  earnedBadges: [],
  allBadges: [],
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
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const fetchClientData = useCallback(async () => {
    try {
      setClientError(null);
      const data = await api.get<{
        client: Client | null;
        userRole: UserRole;
        organizationId: string | null;
        metrics: ClientMetrics | null;
        recentCheckins: Checkin[];
        streak: StreakData;
        earnedBadges: EarnedBadge[];
        allBadges: BadgeDefinition[];
      }>('/api/client/me');
      setClient(data.client ?? null);
      setUserRole(data.userRole ?? null);
      setOrganizationId(data.organizationId ?? null);
      setMetrics(data.metrics);
      setRecentCheckins(data.recentCheckins);
      setStreak(data.streak ?? null);
      setEarnedBadges(data.earnedBadges ?? []);
      setAllBadges(data.allBadges ?? []);
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
          setUserRole(null);
          setOrganizationId(null);
          setMetrics(null);
          setRecentCheckins([]);
          setStreak(null);
          setEarnedBadges([]);
          setAllBadges([]);
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
    setUserRole(null);
    setOrganizationId(null);
    setMetrics(null);
    setRecentCheckins([]);
    setStreak(null);
    setEarnedBadges([]);
    setAllBadges([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        client,
        userRole,
        isAdmin: userRole === 'org_admin',
        organizationId,
        metrics,
        recentCheckins,
        streak,
        earnedBadges,
        allBadges,
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
