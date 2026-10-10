// Client for the FBF Health Sync plugin on forgedbyfreedom.net
// (REST namespace fbf-sync/v1). Authenticates with the same App Bridge token
// the app already holds from login — the plugin validates it by asking the
// App Bridge's own /me endpoint, so there is no second login.
import { getToken } from './wp-auth';
import { FoodLogEntry, WorkoutLog } from '../types';

const WP_URL = process.env.EXPO_PUBLIC_WP_URL || 'https://forgedbyfreedom.net';
export const SYNC_ROOT = `${WP_URL}/wp-json/fbf-sync/v1`;

export class SyncError extends Error {
  status: number;
  /** True when the request never reached the server (offline, DNS, timeout). */
  network: boolean;
  constructor(message: string, status = 0, network = false) {
    super(message);
    this.status = status;
    this.network = network;
  }
}

export async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const token = await getToken();
  if (!token) throw new SyncError('Not signed in', 401);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${SYNC_ROOT}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
  } catch (e) {
    throw new SyncError(e instanceof Error ? e.message : 'Network error', 0, true);
  } finally {
    clearTimeout(timer);
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON (e.g. host error page)
  }
  if (!res.ok || (body && body.ok === false)) {
    throw new SyncError(body?.summary || body?.message || `Server error ${res.status}`, res.status);
  }
  return body as T;
}

// ── Meal labels ─────────────────────────────────────────────────────────────
// The app groups by display labels; the server stores keys.
const LABEL_TO_KEY: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
  'pre-workout': 'pre_workout',
  'post-workout': 'post_workout',
};
const KEY_TO_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
  meal: 'Other',
};
export function mealKey(label?: string): string {
  return LABEL_TO_KEY[(label || '').trim().toLowerCase()] || 'meal';
}
export function mealLabel(key?: string): string {
  return KEY_TO_LABEL[key || 'meal'] || 'Other';
}

/** Local calendar date (YYYY-MM-DD), not UTC — after 8pm Eastern, UTC is already tomorrow. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Server shapes ───────────────────────────────────────────────────────────
interface ServerFood {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
  quantity: number;
  meal: string;
  timestamp: string;
  source: string;
  confidence?: 'high' | 'medium' | 'low' | null;
  client_id?: string | null;
}

export function toEntry(f: ServerFood): FoodLogEntry {
  const source = (['manual', 'meal_plan', 'barcode', 'voice'] as const).includes(f.source as any)
    ? (f.source as FoodLogEntry['source'])
    : 'manual';
  return {
    id: String(f.id),
    name: f.name,
    calories: Number(f.calories) || 0,
    protein_g: Number(f.protein_g) || 0,
    carbs_g: Number(f.carbs_g) || 0,
    fat_g: Number(f.fat_g) || 0,
    serving_size: f.serving_size || '1 serving',
    quantity: Number(f.quantity) || 1,
    meal_label: mealLabel(f.meal),
    timestamp: f.timestamp,
    source,
    confidence: f.confidence ?? undefined,
  };
}

export interface FoodItemInput {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
  quantity: number;
  source: FoodLogEntry['source'];
  client_id: string;
}

// ── Endpoints ───────────────────────────────────────────────────────────────
export async function fetchDay(date: string) {
  const r = await call<{ foods: ServerFood[]; health: Record<string, unknown> | null }>(
    `/day?date=${encodeURIComponent(date)}`
  );
  return { entries: (r.foods || []).map(toEntry), health: r.health };
}

export async function addFoods(date: string, meal: string, items: FoodItemInput[]) {
  const r = await call<{ entries: ServerFood[] }>('/meal', {
    method: 'POST',
    body: JSON.stringify({ date, meal: mealKey(meal), items }),
  });
  return (r.entries || []).map(toEntry);
}

/** Dictated meal → Claude → itemized macros. Longer timeout: the model call runs server-side. */
export async function logMealByVoice(date: string, text: string, meal?: string) {
  const r = await call<{ entries: ServerFood[]; summary: string }>(
    '/meal',
    {
      method: 'POST',
      body: JSON.stringify({ date, text, ...(meal ? { meal: mealKey(meal) } : {}) }),
    },
    60000
  );
  return { entries: (r.entries || []).map(toEntry), summary: r.summary };
}

export async function updateFoodEntry(id: string, fields: Partial<FoodLogEntry>) {
  const body: Record<string, unknown> = {};
  for (const k of ['name', 'serving_size', 'quantity', 'calories', 'protein_g', 'carbs_g', 'fat_g'] as const) {
    if (fields[k] !== undefined) body[k] = fields[k];
  }
  if (fields.meal_label) body.meal = mealKey(fields.meal_label);
  const r = await call<{ entry: ServerFood }>(`/entry/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return toEntry(r.entry);
}

export async function deleteFoodEntry(id: string) {
  await call(`/entry/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function pushHealth(date: string, values: Record<string, unknown>) {
  return call<{ health: Record<string, unknown> }>('/health', {
    method: 'POST',
    body: JSON.stringify({ date, source: 'app', ...values }),
  });
}

export async function pushWorkout(log: WorkoutLog) {
  return call('/workout', { method: 'POST', body: JSON.stringify({ date: log.date, log }) });
}

export async function fetchWorkouts(limit = 60): Promise<WorkoutLog[]> {
  const r = await call<{ logs: WorkoutLog[] }>(`/workouts?limit=${limit}`);
  return r.logs || [];
}
