import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Daily water log, one-tap drinks with undo. Stored on the device per day
 * (key fbf_hydration_YYYY-MM-DD). The day's total is also what the check-in's
 * water field should be prefilled from.
 */

export interface DrinkEntry {
  oz: number;
  at: string; // ISO time
}

const dayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `fbf_hydration_${y}-${m}-${day}`;
};

export const OZ_TO_ML = 29.5735;

export function useHydration() {
  const [entries, setEntries] = useState<DrinkEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(dayKey());

  // Roll over at midnight if the app stays open.
  useEffect(() => {
    const t = setInterval(() => {
      const k = dayKey();
      if (k !== key) setKey(k);
    }, 60_000);
    return () => clearInterval(t);
  }, [key]);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive) return;
        try {
          const parsed = raw ? JSON.parse(raw) : [];
          setEntries(Array.isArray(parsed) ? parsed : []);
        } catch {
          setEntries([]);
        }
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [key]);

  const persist = useCallback(
    (next: DrinkEntry[]) => {
      setEntries(next);
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
    },
    [key]
  );

  const addDrink = useCallback(
    (oz: number) => {
      if (!Number.isFinite(oz) || oz <= 0) return;
      persist([...entries, { oz, at: new Date().toISOString() }]);
    },
    [entries, persist]
  );

  const undoLast = useCallback(() => {
    if (entries.length === 0) return;
    persist(entries.slice(0, -1));
  }, [entries, persist]);

  const totalOz = entries.reduce((sum, e) => sum + e.oz, 0);

  return { entries, totalOz, addDrink, undoLast, loaded };
}
