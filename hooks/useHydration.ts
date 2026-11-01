import { useCallback, useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Daily water log, one-tap drinks with undo. One shared store per day
 * (key fbf_hydration_YYYY-MM-DD) so the Today card, the daily coach sync and
 * anything else reading water always agree.
 */

export interface DrinkEntry {
  oz: number;
  at: string; // ISO time
}

export const OZ_TO_ML = 29.5735;

export const hydrationKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `fbf_hydration_${y}-${m}-${day}`;
};

type Snap = { key: string; entries: DrinkEntry[]; loaded: boolean };
let snap: Snap = { key: hydrationKey(), entries: [], loaded: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let loading: Promise<void> | null = null;

function ensureLoaded() {
  const key = hydrationKey();
  if (snap.key !== key) {
    snap = { key, entries: [], loaded: false }; // new day
    loading = null;
  }
  if (snap.loaded || loading) return;
  loading = AsyncStorage.getItem(key)
    .then((raw) => {
      let entries: DrinkEntry[] = [];
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        entries = Array.isArray(parsed) ? parsed : [];
      } catch {}
      if (snap.key === key) {
        snap = { key, entries, loaded: true };
        emit();
      }
    })
    .catch(() => {
      snap = { ...snap, loaded: true };
      emit();
    })
    .finally(() => {
      loading = null;
    });
}

function write(entries: DrinkEntry[]) {
  snap = { ...snap, entries };
  emit();
  AsyncStorage.setItem(snap.key, JSON.stringify(entries)).catch(() => {});
}

export function useHydration() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snap,
    () => snap
  );

  useEffect(() => {
    ensureLoaded();
    // Roll over at midnight if the app stays open.
    const t = setInterval(ensureLoaded, 60_000);
    return () => clearInterval(t);
  }, []);

  const addDrink = useCallback((oz: number) => {
    if (!Number.isFinite(oz) || oz <= 0) return;
    ensureLoaded();
    write([...snap.entries, { oz, at: new Date().toISOString() }]);
  }, []);

  const undoLast = useCallback(() => {
    if (snap.entries.length === 0) return;
    write(snap.entries.slice(0, -1));
  }, []);

  const totalOz = s.entries.reduce((sum, e) => sum + e.oz, 0);
  return { entries: s.entries, totalOz, addDrink, undoLast, loaded: s.loaded };
}
