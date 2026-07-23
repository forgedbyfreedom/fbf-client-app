import React, { createContext, useEffect, useState, useCallback } from 'react';
import {
  login as wpLogin,
  logout as wpLogout,
  getCachedUser,
  isLoggedIn,
  WPUser,
} from '../lib/wp-auth';
import { fetchClientMe } from '../lib/wp-adapter';
import { Client, ClientMetrics, Checkin, StreakData, EarnedBadge, BadgeDefinition, UserRole } from '../types';
import { demoClientMeResponse } from '../lib/demo-data';

/**
 * Minimal session object kept for API-compatibility with the old
 * Supabase-based context — screens rely on its truthiness, not its shape.
 */
interface WPSession {
  authenticated: true;
  user?: WPUser | null;
}

interface AuthContextType {
  session: WPSession | null;
  user: WPUser | null;
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
  isDemoMode: boolean;
  toggleDemoMode: () => void;
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
  isDemoMode: false,
  toggleDemoMode: () => {},
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshClientData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WPSession | null>(null);
  const [user, setUser] = useState<WPUser | null>(null);
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
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadDemoData = useCallback(() => {
    const d = demoClientMeResponse;
    setClient(d.client ?? null);
    setUserRole(d.userRole ?? null);
    setOrganizationId(d.organizationId ?? null);
    setMetrics(d.metrics);
    setRecentCheckins(d.recentCheckins);
    setStreak(d.streak ?? null);
    setEarnedBadges(d.earnedBadges ?? []);
    setAllBadges(d.allBadges ?? []);
    setClientError(null);
    setLoading(false);
  }, []);

  const clearAllData = useCallback(() => {
    setClient(null);
    setUserRole(null);
    setOrganizationId(null);
    setMetrics(null);
    setRecentCheckins([]);
    setStreak(null);
    setEarnedBadges([]);
    setAllBadges([]);
  }, []);

  const fetchClientData = useCallback(async () => {
    // Skip API calls when demo mode is active
    if (isDemoMode) return;
    try {
      setClientError(null);
      const data = await fetchClientMe();
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
  }, [isDemoMode]);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      if (next) {
        loadDemoData();
      } else {
        clearAllData();
        // Re-fetch real data if there is an active session.
        if (session) {
          // Microtask so isDemoMode state has updated before fetch reads it.
          setTimeout(() => {
            fetchClientMe()
              .then((data) => {
                setClient(data.client ?? null);
                setUserRole(data.userRole ?? null);
                setOrganizationId(data.organizationId ?? null);
                setMetrics(data.metrics);
                setRecentCheckins(data.recentCheckins);
                setStreak(data.streak ?? null);
                setEarnedBadges(data.earnedBadges ?? []);
                setAllBadges(data.allBadges ?? []);
              })
              .catch(() => {});
          }, 0);
        }
      }
      return next;
    });
  }, [loadDemoData, clearAllData, session]);

  // Bootstrap: restore the WordPress token session from SecureStore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await isLoggedIn()) {
          const u = await getCachedUser();
          if (cancelled) return;
          setUser(u);
          setSession({ authenticated: true, user: u });
          fetchClientData();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchClientData]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const u = await wpLogin(email, password);
        setUser(u);
        setSession({ authenticated: true, user: u });
        fetchClientData();
        return { error: null };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Login failed — try again.';
        return { error: message };
      }
    },
    [fetchClientData]
  );

  const signOut = useCallback(async () => {
    setIsDemoMode(false);
    await wpLogout();
    setSession(null);
    setUser(null);
    clearAllData();
  }, [clearAllData]);

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
        isDemoMode,
        toggleDemoMode,
        signIn,
        signOut,
        refreshClientData: fetchClientData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
