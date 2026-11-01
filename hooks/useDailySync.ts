import { useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { useFoodLog } from './useFoodLog';
import { useHydration, hydrationKey } from './useHydration';
import { normalizeMealPlan } from '../lib/normalize-plan';
import { getTodaysWorkout, getTodayDayOfWeek } from '../lib/workout-utils';
import { postDailyLog, localDay, DailyLog } from '../lib/hub';

/**
 * Sends today's compliance (meals eaten vs plan, off-plan meals, water vs
 * target, supplements taken, whether today is a training day) to the coach
 * hub, so the coach's evening digest and alerts see the same numbers the
 * client sees. Debounced; only posts when something changed.
 */
export function useDailySync() {
  const { client } = useAuth();
  const { entries } = useFoodLog();
  const { totalOz, loaded: waterLoaded } = useHydration();
  const lastSent = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plan = useMemo(() => {
    if (!client) return null;
    const days = normalizeMealPlan(client.meal_plan);
    const today = getTodayDayOfWeek().toLowerCase();
    const day = days.find((d) => d.day?.toLowerCase() === today) ?? days[0] ?? null;
    return {
      mealNames: (day?.meals ?? []).map((m) => m.name),
      trainingDay: !!getTodaysWorkout(client.workout_program ?? null),
      supplementCount:
        (client.current_supplements?.length ?? 0) +
        (client.current_peptides?.length ?? 0) +
        (client.current_peds?.length ?? 0) +
        (client.medical_protocol?.length ?? 0),
    };
  }, [client]);

  // One-time: move the last two weeks of on-device water and supplement logs
  // to the server, so the coach (and the web app) see history logged before
  // daily sync existed.
  useEffect(() => {
    if (!client) return;
    (async () => {
      const flag = `fbf_hub_backfill_v1_${client.id}`;
      if (await AsyncStorage.getItem(flag)) return;
      for (let i = 1; i <= 14; i++) {
        const d = new Date(Date.now() - i * 86400000);
        const day = localDay(d);
        const log: DailyLog = {};
        try {
          const w = await AsyncStorage.getItem(hydrationKey(d));
          if (w) log.water_oz = Math.round((JSON.parse(w) as { oz: number }[]).reduce((a, e) => a + (e.oz || 0), 0));
          const s = await AsyncStorage.getItem(`fbf_supplement_log_${day}`);
          if (s) log.supplements_taken = Object.values(JSON.parse(s) as Record<string, boolean>).filter(Boolean).length;
        } catch {}
        if (Object.keys(log).length) await postDailyLog(log, day);
      }
      await AsyncStorage.setItem(flag, '1');
    })().catch(() => undefined);
  }, [client]);

  useEffect(() => {
    if (!client || !plan || !waterLoaded) return;
    let cancelled = false;

    const build = async (): Promise<DailyLog> => {
      const eaten = new Set(entries.filter((e) => e.source === 'meal_plan').map((e) => e.name));
      const offPlanMeals = new Set(
        entries.filter((e) => e.source !== 'meal_plan').map((e) => e.meal_label || e.name)
      );
      let supplementsTaken = 0;
      try {
        const d = new Date();
        const key = `fbf_supplement_log_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) supplementsTaken = Object.values(JSON.parse(raw) as Record<string, boolean>).filter(Boolean).length;
      } catch {}
      return {
        meals_planned: plan.mealNames.length,
        meals_eaten: plan.mealNames.filter((n) => eaten.has(n)).length,
        off_plan_meals: offPlanMeals.size,
        water_oz: Math.round(totalOz),
        water_target_oz: client.target_water_oz ?? undefined,
        training_day: plan.trainingDay,
        supplements_planned: plan.supplementCount || undefined,
        supplements_taken: plan.supplementCount ? supplementsTaken : undefined,
      };
    };

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const log = await build();
      const sig = localDay() + JSON.stringify(log);
      if (cancelled || sig === lastSent.current) return;
      lastSent.current = sig;
      postDailyLog(log);
    }, 2500);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [client, plan, entries, totalOz, waterLoaded]);
}
