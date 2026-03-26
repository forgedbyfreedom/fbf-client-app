import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodLogEntry, DailyFoodLog } from '../types';
import { useAuth } from './useAuth';
import { MealPlanDay } from '../lib/nutrition-api';

const STORAGE_PREFIX = 'fbf_food_log_';

function getDateKey(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

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

export function useFoodLog(date?: Date) {
  const dateKey = getDateKey(date);
  const storageKey = `${STORAGE_PREFIX}${dateKey}`;
  const { client } = useAuth();

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load entries from AsyncStorage
  const loadEntries = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed: FoodLogEntry[] = JSON.parse(raw);
        setEntries(parsed);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Persist entries whenever they change
  const persistEntries = useCallback(
    async (newEntries: FoodLogEntry[]) => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(newEntries));
      } catch (err) {
        console.error('Failed to persist food log:', err);
      }
    },
    [storageKey]
  );

  const addFood = useCallback(
    async (entry: Omit<FoodLogEntry, 'id' | 'timestamp'>) => {
      const newEntry: FoodLogEntry = {
        ...entry,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };
      const updated = [...entries, newEntry];
      setEntries(updated);
      await persistEntries(updated);
      return newEntry;
    },
    [entries, persistEntries]
  );

  const removeFood = useCallback(
    async (id: string) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      await persistEntries(updated);
    },
    [entries, persistEntries]
  );

  const updateFood = useCallback(
    async (id: string, updates: Partial<FoodLogEntry>) => {
      const updated = entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
      setEntries(updated);
      await persistEntries(updated);
    },
    [entries, persistEntries]
  );

  const clearLog = useCallback(async () => {
    setEntries([]);
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  // Get today's day name for meal plan matching
  const getDayName = useCallback((): string => {
    const d = date || new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
  }, [date]);

  // Pre-populate from meal plan
  const populateFromMealPlan = useCallback(async () => {
    if (!client?.meal_plan || !Array.isArray(client.meal_plan) || client.meal_plan.length === 0) {
      return;
    }

    const mealPlan = client.meal_plan as MealPlanDay[];
    const dayName = getDayName();
    const todayPlan = mealPlan.find((d) => d.day === dayName);
    if (!todayPlan) return;

    const mealEntries: FoodLogEntry[] = todayPlan.meals.map((meal) => ({
      id: generateId(),
      name: meal.name,
      calories: meal.calories || 0,
      protein_g: meal.protein_g || 0,
      carbs_g: meal.carbs_g || 0,
      fat_g: meal.fat_g || 0,
      serving_size: '1 serving',
      quantity: 1,
      meal_label: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
      timestamp: new Date().toISOString(),
      source: 'meal_plan' as const,
    }));

    const updated = [...entries, ...mealEntries];
    setEntries(updated);
    await persistEntries(updated);
  }, [client?.meal_plan, getDayName, entries, persistEntries]);

  // Log a single meal from meal plan
  const logMeal = useCallback(
    async (meal: { name: string; type: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }) => {
      const entry: Omit<FoodLogEntry, 'id' | 'timestamp'> = {
        name: meal.name,
        calories: meal.calories || 0,
        protein_g: meal.protein_g || 0,
        carbs_g: meal.carbs_g || 0,
        fat_g: meal.fat_g || 0,
        serving_size: '1 serving',
        quantity: 1,
        meal_label: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
        source: 'meal_plan',
      };
      return addFood(entry);
    },
    [addFood]
  );

  // Check if a meal has been logged
  const isMealLogged = useCallback(
    (mealName: string): boolean => {
      return entries.some((e) => e.name === mealName && e.source === 'meal_plan');
    },
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
    () => ({
      date: dateKey,
      entries,
      totals,
    }),
    [dateKey, entries, totals]
  );

  return {
    entries,
    totals,
    entriesByMeal,
    foodLog,
    loading,
    addFood,
    removeFood,
    updateFood,
    clearLog,
    populateFromMealPlan,
    logMeal,
    isMealLogged,
    hasEntries: entries.length > 0,
  };
}
