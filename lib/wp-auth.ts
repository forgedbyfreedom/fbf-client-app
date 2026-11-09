// WordPress token auth for the FBF App Bridge (forgedbyfreedom.net).
// Replaces Supabase auth: same login/logout/session surface, one backend.
import * as SecureStore from './secure-storage';

const WP_URL = process.env.EXPO_PUBLIC_WP_URL || 'https://forgedbyfreedom.net';
const API_ROOT = `${WP_URL}/wp-json/fbf/v1`;
const WP_JSON_ROOT = `${WP_URL}/wp-json/`;
const TOKEN_KEY = 'fbf_wp_token';
const USER_KEY = 'fbf_wp_user';

export interface WPUser {
  id: number;
  name: string;
  email: string;
  plan: string;
  status: string;
  program: string;
}

/* ---------------- session events ----------------
 * Fired on login, logout and when the server says the stored token is no
 * longer valid. AuthProvider listens so an expired token sends the member
 * back to the sign-in screen instead of leaving every screen showing a raw
 * "API 401" error. Per-user caches listen so the next account starts clean.
 */
export type AuthEvent = 'login' | 'logout' | 'expired';
const authListeners = new Set<(e: AuthEvent) => void>();
export function onAuthEvent(listener: (e: AuthEvent) => void): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}
function emitAuth(e: AuthEvent) {
  authListeners.forEach((l) => {
    try {
      l(e);
    } catch (err) {
      console.warn('auth listener failed', err);
    }
  });
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItem(TOKEN_KEY);
}

export async function getCachedUser(): Promise<WPUser | null> {
  const raw = await SecureStore.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WPUser;
  } catch {
    return null;
  }
}

async function clearStoredSession() {
  await SecureStore.deleteItem(TOKEN_KEY);
  await SecureStore.deleteItem(USER_KEY);
}

export async function login(email: string, password: string): Promise<WPUser> {
  const res = await rawFetch(`${API_ROOT}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) {
    throw new Error(body?.message || `Login failed (${res.status})`);
  }
  await SecureStore.setItem(TOKEN_KEY, body.token);
  await SecureStore.setItem(USER_KEY, JSON.stringify(body.user));
  emitAuth('login');
  return body.user as WPUser;
}

export async function logout(): Promise<void> {
  const token = await getToken();
  if (token) {
    try {
      await rawFetch(`${API_ROOT}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // network failure on logout is non-fatal; token is discarded locally
    }
  }
  await clearStoredSession();
  emitAuth('logout');
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getToken()) !== null;
}

/* ---------------- 401 handling ----------------
 * Every WordPress plugin the app talks to (App Bridge, Coach Hub, Health Sync,
 * BodyScan) answers 401 when the token has expired or been revoked. One 401 on
 * its own is not proof the session is dead — a single plugin can reject a
 * token the App Bridge still honours — so before signing anyone out we ask the
 * App Bridge itself (GET /client/me). Only if that also says 401 is the stored
 * session cleared. Concurrent 401s share one check.
 */
let verifying: Promise<boolean> | null = null;

/** Resolves true if the session was found dead and cleared. */
export function handleUnauthorized(sentToken: string): Promise<boolean> {
  if (!verifying) {
    verifying = (async () => {
      try {
        const current = await getToken();
        // Already signed out, or a newer login replaced the token we sent.
        if (!current || current !== sentToken) return false;
        let dead = false;
        try {
          const res = await rawFetch(`${API_ROOT}/client/me`, {
            headers: { Authorization: `Bearer ${current}` },
          });
          dead = res.status === 401 || res.status === 403;
        } catch {
          return false; // offline — never sign someone out for a network blip
        }
        if (!dead) return false;
        if ((await getToken()) !== current) return false;
        await clearStoredSession();
        emitAuth('expired');
        return true;
      } finally {
        // Let the next distinct burst of 401s verify again.
        setTimeout(() => {
          verifying = null;
        }, 0);
      }
    })();
  }
  return verifying;
}

function headerValue(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const hit = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return hit ? hit[1] : null;
  }
  const rec = headers as Record<string, string>;
  const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? rec[key] : null;
}

// Untouched fetch, captured before the interceptor below is installed.
const rawFetch: typeof fetch = (...args) => originalFetch(...args);
let originalFetch: typeof fetch = (...args) => fetch(...args);

/**
 * Installs a thin wrapper around global fetch that watches responses from
 * this site's /wp-json/ API. Any 401 on a request that carried our bearer
 * token triggers handleUnauthorized(). Call once at app start.
 */
let installed = false;
export function installSessionWatcher() {
  if (installed || typeof globalThis.fetch !== 'function') return;
  installed = true;
  const base = globalThis.fetch.bind(globalThis);
  originalFetch = base;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await base(input as any, init);
    try {
      if (res.status === 401) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url && url.startsWith(WP_JSON_ROOT) && !url.includes('/auth/login') && !url.includes('/auth/logout')) {
          const auth =
            headerValue(init?.headers, 'Authorization') ??
            (typeof Request !== 'undefined' && input instanceof Request ? input.headers.get('Authorization') : null);
          const sent = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
          if (sent) void handleUnauthorized(sent);
        }
      }
    } catch {
      // never let the watcher break a request
    }
    return res;
  }) as typeof fetch;
}

/** Turn a WP REST error body into a sentence a member can read. */
export function friendlyApiError(status: number, bodyText: string): string {
  let msg: string | null = null;
  try {
    const j = JSON.parse(bodyText);
    if (j && typeof j.message === 'string' && j.message.trim()) msg = j.message.trim();
  } catch {
    // not JSON
  }
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return msg || "You don't have access to that.";
  if (status === 404) return msg || 'Not found.';
  if (status >= 500) return 'The server had a problem. Try again in a minute.';
  return msg || `Something went wrong (${status}).`;
}

export const wpApiRoot = API_ROOT;
