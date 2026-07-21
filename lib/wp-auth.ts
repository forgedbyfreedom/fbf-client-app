// WordPress token auth for the FBF App Bridge (forgedbyfreedom.net).
// Replaces Supabase auth: same login/logout/session surface, one backend.
import * as SecureStore from 'expo-secure-store';

const WP_URL = process.env.EXPO_PUBLIC_WP_URL || 'https://forgedbyfreedom.net';
const API_ROOT = `${WP_URL}/wp-json/fbf/v1`;
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

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getCachedUser(): Promise<WPUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? (JSON.parse(raw) as WPUser) : null;
}

export async function login(email: string, password: string): Promise<WPUser> {
  const res = await fetch(`${API_ROOT}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message || `Login failed (${res.status})`);
  }
  await SecureStore.setItemAsync(TOKEN_KEY, body.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(body.user));
  return body.user as WPUser;
}

export async function logout(): Promise<void> {
  const token = await getToken();
  if (token) {
    try {
      await fetch(`${API_ROOT}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // network failure on logout is non-fatal; token is discarded locally
    }
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getToken()) !== null;
}

export const wpApiRoot = API_ROOT;
