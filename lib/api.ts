// API layer — now backed by the WordPress App Bridge on forgedbyfreedom.net.
// Auth token comes from lib/wp-auth (SecureStore), not Supabase.
import { getToken, wpApiRoot } from './wp-auth';

const API_BASE = wpApiRoot; // e.g. https://forgedbyfreedom.net/wp-json/fbf/v1

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (!contentType.includes('application/json')) {
    throw new Error(
      `API returned non-JSON response (${contentType}). The server may be redirecting to a login page.`
    );
  }
  return res.json();
}

export async function apiUpload(
  path: string,
  fileUri: string,
  fields: Record<string, string> = {}
): Promise<unknown> {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'upload';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType =
    ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
  upload: apiUpload,
};
