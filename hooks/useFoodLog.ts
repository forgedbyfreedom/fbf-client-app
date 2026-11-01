import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { FoodLogEntry, DailyFoodLog } from '../types';
import { useAuth } from './useAuth';
import { MealPlanDay } from '../lib/nutrition-api';
import { localDateKey } from '../lib/fbf-sync';
import {
  addByVoice,
  addEntry,
  flush,
  getSnapshot,
  loadDay,
  removeEntry,
  subscribe,
  updateEntry,
} from '../lib/food-log-store';

function calculateTotals(entries: FoodLogEntry[]) {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories * entry.quantity,
      protein_g: acc.protein_g + entry.protein_g * entry.quantity,
      carbs_g: acc.carbs_g + entry.carbs_g * entry.quantity,
      fat_g: acc.fat_g + entry.fat_g * entry.quantity,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/**
 * Food log for one day, stored on forgedbyfreedom.net and shared across every
 * screen. See lib/food-log-store.ts for the sync and offline behaviour.
 */
export function useFoodLog(date?: Date) {
  const dateKey = localDateKey(date);
  const { client } = useAuth();

  const snap = useSyncExternalStore(
    subscribe,
    () => getSnapshot(dateKey),
    () => getSnapshot(dateKey)
  );

  useEffect(() => {
    loadDay(dateKey).catch(() => undefined);
  }, [dateKey]);

  const entries = snap.entries;

  const addFood = useCallback(
    (entry: Omit<FoodLogEntry, 'id' | 'timestamp'>) => addEntry(dateKey, entry),
    [dateKey]
  );

  const removeFood = useCallback((id: string) => removeEntry(dateKey, id), [dateKey]);

  const updateFood = useCallback(
    (id: string, updates: Partial<FoodLogEntry>) => updateEntry(dateKey, id, updates),
    [dateKey]
  );

  const clearLog = useCallback(async () => {
    for (const e of getSnapshot(dateKey).entries) {
      await removeEntry(dateKey, e.id);
    }
  }, [dateKey]);

  /** Dictated or typed description → itemized macros (server-side, needs a connection). */
  const logByVoice = useCallback(
    (text: string, mealLabel?: string) => addByVoice(dateKey, text, mealLabel),
    [dateKey]
  );

  const refresh = useCallback(() => loadDay(dateKey), [dateKey]);

  const getDayName = useCallback((): string => {
    const d = date || new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
  }, [date]);

  const populateFromMealPlan = useCallback(async () => {
    if (!client?.meal_plan || !Array.isArray(client.meal_plan) || client.meal_plan.length === 0) {
      return;
    }
    const mealPlan = client.meal_plan as MealPlanDay[];
    const todayPlan = mealPlan.find((d) => d.day === getDayName());
    if (!todayPlan) return;
    for (const meal of todayPlan.meals) {
      await addEntry(dateKey, {
        name: meal.name,
        calories: meal.calories || 0,
        protein_g: meal.protein_g || 0,
        carbs_g: meal.carbs_g || 0,
        fat_g: meal.fat_g || 0,
        serving_size: '1 serving',
        quantity: 1,
        meal_label: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
        source: 'meal_plan',
      });
    }
  }, [client?.meal_plan, getDayName, dateKey]);

  const logMeal = useCallback(
    async (meal: {
      name: string;
      type: string;
      calories: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
    }) =>
      addEntry(dateKey, {
        name: meal.name,
        calories: meal.calories || 0,
        protein_g: meal.protein_g || 0,
        carbs_g: meal.carbs_g || 0,
        fat_g: meal.fat_g || 0,
        serving_size: '1 serving',
        quantity: 1,
        meal_label: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
        source: 'meal_plan',
      }),
    [dateKey]
  );

  const isMealLogged = useCallback(
    (mealName: string): boolean =>
      entries.some((e) => e.name === mealName && e.source === 'meal_plan'),
    [entries]
  );

  const totals = useMemo(() => calculateTotals(entries), [entries]);

  const entriesByMeal = useMemo(() => {
    const grouped: Record<string, FoodLogEntry[]> = {};
    for (const entry of entries) {
      const label = entry.meal_label || 'Other';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(entry);
    }
    return grouped;
  }, [entries]);

  const foodLog: DailyFoodLog = useMemo(
    () => ({ date: dateKey, entries, totals }),
    [dateKey, entries, totals]
  );

  return {
    entries,
    totals,
    entriesByMeal,
    foodLog,
    loading: snap.loading,
    syncError: snap.error,
    pendingCount: snap.pendingCount,
    addFood,
    removeFood,
    updateFood,
    clearLog,
    populateFromMealPlan,
    logMeal,
    logByVoice,
    refresh,
    retrySync: flush,
    isMealLogged,
    hasEntries: entries.length > 0,
  };
}
