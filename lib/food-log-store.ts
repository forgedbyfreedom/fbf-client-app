// Shared, server-backed food log.
//
// forgedbyfreedom.net is the source of truth (so coaches see it). Every screen
// that calls useFoodLog() reads the same in-memory store, so adding a food on
// the Food Log screen updates the dashboard and check-in instantly.
//
// Writes are optimistic and go through a persisted queue: if the phone is
// offline the change shows immediately (marked pending) and is replayed in
// order the next time the app can reach the site. Adds carry a client_id the
// server de-duplicates on, so a retry after a dropped response never doubles
// an entry.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodLogEntry } from '../types';
import {
  addFoods,
  deleteFoodEntry,
  fetchDay,
  FoodItemInput,
  logMealByVoice,
  mealKey,
  mealLabel,
  SyncError,
  updateFoodEntry,
} from './fbf-sync';

const QUEUE_KEY = 'fbf_food_queue_v1';
const DAY_CACHE_PREFIX = 'fbf_food_day_v2_';
const LEGACY_PREFIX = 'fbf_food_log_'; // pre-sync, phone-only log
const MIGRATED_KEY = 'fbf_food_legacy_migrated_v1';

type Op =
  | { type: 'add'; date: string; meal: string; item: FoodItemInput }
  | { type: 'update'; date: string; id: string; fields: Partial<FoodLogEntry> }
  | { type: 'remove'; date: string; id: string };

export interface DaySnapshot {
  date: string;
  entries: FoodLogEntry[];
  loading: boolean;
  /** Last error talking to the site, if the latest attempt failed. */
  error: string | null;
  pendingCount: number;
}

const serverDays: Record<string, FoodLogEntry[]> = {};
const loadingDays = new Set<string>();
const dayErrors: Record<string, string | null> = {};
const snapshots: Record<string, DaySnapshot> = {};
const listeners = new Set<() => void>();
let queue: Op[] = [];
let queueLoaded: Promise<void> | null = null;
let flushing: Promise<void> | null = null;

function isLocalId(id: string) {
  return id.startsWith('local-') || id.startsWith('legacy-');
}

export function newClientId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Snapshot / subscription ────────────────────────────────────────────────
function build(date: string): DaySnapshot {
  let entries = [...(serverDays[date] || [])];
  let pending = 0;
  for (const op of queue) {
    if (op.date !== date) continue;
    pending++;
    if (op.type === 'add') {
      if (!entries.some((e) => e.id === op.item.client_id)) {
        entries.push({
          id: op.item.client_id,
          name: op.item.name,
          calories: op.item.calories,
          protein_g: op.item.protein_g,
          carbs_g: op.item.carbs_g,
          fat_g: op.item.fat_g,
          serving_size: op.item.serving_size,
          quantity: op.item.quantity,
          meal_label: mealLabel(op.meal),
          timestamp: new Date().toISOString(),
          source: op.item.source,
          pending: true,
        });
      }
    } else if (op.type === 'update') {
      entries = entries.map((e) => (e.id === op.id ? { ...e, ...op.fields, pending: true } : e));
    } else {
      entries = entries.filter((e) => e.id !== op.id);
    }
  }
  return {
    date,
    entries,
    loading: loadingDays.has(date) && !serverDays[date],
    error: dayErrors[date] ?? null,
    pendingCount: pending,
  };
}

function emit(dates?: string[]) {
  const touched = dates ?? Object.keys(snapshots);
  for (const d of touched) snapshots[d] = build(d);
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(date: string): DaySnapshot {
  if (!snapshots[date]) snapshots[date] = build(date);
  return snapshots[date];
}

// ── Persistence ────────────────────────────────────────────────────────────
async function persistQueue() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[food-log] could not persist queue', e);
  }
}

function ensureQueue(): Promise<void> {
  if (!queueLoaded) {
    queueLoaded = (async () => {
      try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        if (raw) queue = JSON.parse(raw);
      } catch {
        queue = [];
      }
      await migrateLegacy();
    })();
  }
  return queueLoaded;
}

/** One time: upload foods logged before sync existed (they lived only on the phone). */
async function migrateLegacy() {
  try {
    if (await AsyncStorage.getItem(MIGRATED_KEY)) return;
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(LEGACY_PREFIX));
    for (const key of keys) {
      const date = key.slice(LEGACY_PREFIX.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const raw = await AsyncStorage.getItem(key);
      const old: FoodLogEntry[] = raw ? JSON.parse(raw) : [];
      for (const e of old) {
        queue.push({
          type: 'add',
          date,
          meal: mealKey(e.meal_label),
          item: {
            name: e.name,
            calories: e.calories,
            protein_g: e.protein_g,
            carbs_g: e.carbs_g,
            fat_g: e.fat_g,
            serving_size: e.serving_size,
            quantity: e.quantity || 1,
            source: e.source,
            client_id: `legacy-${e.id}`,
          },
        });
      }
    }
    await persistQueue();
    // Legacy keys stay until the queue drains, then are removed in flush().
    await AsyncStorage.setItem(MIGRATED_KEY, '1');
  } catch (e) {
    console.warn('[food-log] legacy migration skipped', e);
  }
}

// ── Sync ───────────────────────────────────────────────────────────────────
export function flush(): Promise<void> {
  // A pass is already running (e.g. one that started while offline). Don't
  // piggyback on it — it may be about to give up. Run a fresh pass after it.
  if (flushing) return flushing.then(() => flush());
  flushing = (async () => {
    await ensureQueue();
    const touched = new Set<string>();
    while (queue.length) {
      const op = queue[0];
      try {
        if (op.type === 'add') {
          const [saved] = await addFoods(op.date, op.meal, [op.item]);
          if (saved) {
            const day = serverDays[op.date] || [];
            serverDays[op.date] = [...day.filter((e) => e.id !== saved.id), saved];
            // Later ops that referenced the local id now point at the real one.
            for (const later of queue.slice(1)) {
              if ((later.type === 'update' || later.type === 'remove') && later.id === op.item.client_id) {
                later.id = saved.id;
              }
            }
          }
        } else if (op.type === 'update') {
          if (!isLocalId(op.id)) {
            const saved = await updateFoodEntry(op.id, op.fields);
            serverDays[op.date] = (serverDays[op.date] || []).map((e) => (e.id === saved.id ? saved : e));
          }
        } else {
          if (!isLocalId(op.id)) await deleteFoodEntry(op.id);
          serverDays[op.date] = (serverDays[op.date] || []).filter((e) => e.id !== op.id);
        }
        touched.add(op.date);
        dayErrors[op.date] = null;
        queue.shift();
        await persistQueue();
      } catch (e) {
        const err = e as SyncError;
        if (err.network || err.status === 401 || err.status >= 500) {
          // Try again later (offline, logged out, or site trouble). Keep order.
          dayErrors[op.date] = err.message;
          touched.add(op.date);
          break;
        }
        // 4xx other than 401: this op can never succeed (e.g. entry already gone). Drop it.
        console.warn('[food-log] dropping op', op.type, err.message);
        queue.shift();
        await persistQueue();
        touched.add(op.date);
      }
    }
    if (!queue.length) {
      const legacy = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(LEGACY_PREFIX));
      if (legacy.length) await AsyncStorage.multiRemove(legacy);
    }
    for (const d of touched) await cacheDay(d);
    emit([...touched]);
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function cacheDay(date: string) {
  if (!serverDays[date]) return;
  try {
    await AsyncStorage.setItem(DAY_CACHE_PREFIX + date, JSON.stringify(serverDays[date]));
  } catch {
    // cache is best-effort
  }
}

export async function loadDay(date: string): Promise<void> {
  await ensureQueue();
  if (!serverDays[date]) {
    // Show the last known copy instantly while the network call runs.
    try {
      const cached = await AsyncStorage.getItem(DAY_CACHE_PREFIX + date);
      if (cached) serverDays[date] = JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  loadingDays.add(date);
  emit([date]);
  try {
    await flush();
    const { entries } = await fetchDay(date);
    serverDays[date] = entries;
    dayErrors[date] = null;
    await cacheDay(date);
  } catch (e) {
    dayErrors[date] = (e as Error).message;
    if (!serverDays[date]) serverDays[date] = [];
  } finally {
    loadingDays.delete(date);
    emit([date]);
  }
}

// ── Mutations ──────────────────────────────────────────────────────────────
async function enqueue(op: Op) {
  await ensureQueue();
  if ((op.type === 'update' || op.type === 'remove') && isLocalId(op.id)) {
    // Target hasn't reached the server yet: edit or cancel the queued add instead.
    const idx = queue.findIndex((q) => q.type === 'add' && q.item.client_id === op.id);
    if (idx >= 0) {
      const add = queue[idx] as Extract<Op, { type: 'add' }>;
      if (op.type === 'remove') {
        queue.splice(idx, 1);
      } else {
        const f = op.fields;
        add.item = {
          ...add.item,
          ...(f.name !== undefined && { name: f.name }),
          ...(f.calories !== undefined && { calories: f.calories }),
          ...(f.protein_g !== undefined && { protein_g: f.protein_g }),
          ...(f.carbs_g !== undefined && { carbs_g: f.carbs_g }),
          ...(f.fat_g !== undefined && { fat_g: f.fat_g }),
          ...(f.serving_size !== undefined && { serving_size: f.serving_size }),
          ...(f.quantity !== undefined && { quantity: f.quantity }),
        };
        if (f.meal_label) add.meal = mealKey(f.meal_label);
      }
      await persistQueue();
      emit([op.date]);
      return;
    }
  }
  queue.push(op);
  await persistQueue();
  emit([op.date]);
  flush().catch(() => undefined);
}

export async function addEntry(
  date: string,
  entry: Omit<FoodLogEntry, 'id' | 'timestamp'>
): Promise<FoodLogEntry> {
  const client_id = newClientId();
  await enqueue({
    type: 'add',
    date,
    meal: mealKey(entry.meal_label),
    item: {
      name: entry.name,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      serving_size: entry.serving_size,
      quantity: entry.quantity || 1,
      source: entry.source,
      client_id,
    },
  });
  return { ...entry, id: client_id, timestamp: new Date().toISOString(), pending: true };
}

export function updateEntry(date: string, id: string, fields: Partial<FoodLogEntry>) {
  const { id: _ignore, pending: _p, ...clean } = fields;
  return enqueue({ type: 'update', date, id, fields: clean });
}

export function removeEntry(date: string, id: string) {
  return enqueue({ type: 'remove', date, id });
}

/** Dictation needs the server (Claude parses it), so this is online-only. */
export async function addByVoice(date: string, text: string, meal?: string) {
  await flush();
  const res = await logMealByVoice(date, text, meal);
  serverDays[date] = [...(serverDays[date] || []), ...res.entries];
  dayErrors[date] = null;
  await cacheDay(date);
  emit([date]);
  return res;
}
