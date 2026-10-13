// Pushes Apple Health data to forgedbyfreedom.net so coaches see it without the
// member typing anything. Runs when the app opens or comes to the foreground
// (throttled). Each pass sends today, yesterday (whose steps/energy keep
// growing late and whose sleep lands the next morning) and every day since the
// last successful sync — up to two weeks — so days the app wasn't opened are
// still filled in.
//
// The server keeps one row per member per day and merges each push, so
// repeated syncs only refine the numbers.
import { NativeModules, Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { call, localDateKey, pushHealth } from './fbf-sync';

/** What the last sync did, for the home-screen card. */
export interface HealthSyncStatus {
  at: number;
  ok: boolean;
  message: string;
  daysSent: number;
}
let status: HealthSyncStatus | null = null;
const statusListeners = new Set<() => void>();
function setStatus(s: HealthSyncStatus) {
  status = s;
  statusListeners.forEach((l) => l());
}
export function useHealthSyncStatus(): HealthSyncStatus | null {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => status
  );
}

/** Best-effort report to forgedbyfreedom.net so a silent failure is visible there. */
function report(diag: Record<string, unknown>) {
  call('/health/diag', {
    method: 'POST',
    body: JSON.stringify({
      ...diag,
      platform: Platform.OS,
      update_id: (Updates as any).updateId ?? null,
      native_module: !!(NativeModules as any).AppleHealthKit,
      via: HK ? (HK === (NativeModules as any).AppleHealthKit ? 'native' : 'library') : 'none',
    }),
  }).catch(() => undefined);
}

const LAST_SYNC_KEY = 'fbf_health_last_sync';
// v2: re-send the last two weeks once so workouts (read correctly from this build) backfill.
const LAST_DAY_KEY = 'fbf_health_last_day_v2';
const MIN_INTERVAL_MS = 15 * 60 * 1000;
const MAX_BACKFILL_DAYS = 14;

let HK: any = null;
let PERMS: { permissions: { read: string[]; write: string[] } } | null = null;

if (Platform.OS === 'ios') {
  try {
    const RNHealth = require('react-native-health');
    // The library does `module.exports = HealthKit` (no default export), so
    // `.default` is undefined — reading it left Apple Health sync silently off.
    // The library builds its export with Object.assign({}, NativeModules.AppleHealthKit),
    // which copies nothing under React Native's new architecture (native modules
    // are host objects with no own enumerable methods). Call the native module
    // directly when the library's copy has no methods.
    const lib = RNHealth?.default ?? RNHealth;
    const native = (NativeModules as any).AppleHealthKit;
    HK = lib && typeof lib.initHealthKit === 'function' ? lib : native && typeof native.initHealthKit === 'function' ? native : null;
    const P = RNHealth?.Constants?.Permissions || RNHealth?.HealthKitPermission || {};
    const p = (name: string) => P[name] ?? name;
    PERMS = {
      permissions: {
        read: [
          p('StepCount'),
          p('SleepAnalysis'),
          p('HeartRate'),
          p('RestingHeartRate'),
          p('HeartRateVariability'),
          p('BodyTemperature'),
          p('ActiveEnergyBurned'),
          p('BasalEnergyBurned'),
          p('AppleExerciseTime'),
          p('DistanceWalkingRunning'),
          p('Workout'),
          p('Weight'),
          p('BodyFatPercentage'),
          p('BloodGlucose'),
        ],
        write: [],
      },
    };
  } catch {
    // react-native-health not linked in this build
  }
}

/** Same read list the check-in auto-fill uses, so iOS shows one permission sheet. */
export const HEALTH_PERMISSIONS = PERMS;

function q<T>(fn: (opts: any, cb: (err: any, res: T) => void) => void, opts: any): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      fn.call(HK, opts, (err: any, res: T) => resolve(err ? null : res));
    } catch {
      resolve(null);
    }
  });
}

let initError: string | null = null;
function init(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!HK || !PERMS) return resolve(false);
    HK.initHealthKit(PERMS, (err: any) => {
      initError = err ? String(err?.message || err) : null;
      resolve(!err);
    });
  });
}

function dayBounds(day: Date) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const now = new Date();
  return { start, end: end > now ? now : end };
}

let lastCounts = { sleep: 0, workouts: 0 };

const sumValues = (rows: Array<{ value: number }> | null) =>
  (rows || []).reduce((a, r) => a + (Number(r.value) || 0), 0);

async function collectDay(day: Date): Promise<Record<string, unknown>> {
  const { start, end } = dayBounds(day);
  const range = { startDate: start.toISOString(), endDate: end.toISOString() };
  const out: Record<string, unknown> = {};

  const [steps, active, basal, exercise, distance, restingRows, hrvRows, hrRows, sleepRows, workouts, glucose] =
    await Promise.all([
      q<{ value: number }>(HK.getStepCount, { date: start.toISOString(), includeManuallyAdded: true }),
      q<Array<{ value: number }>>(HK.getActiveEnergyBurned, { ...range, includeManuallyAdded: true }),
      q<Array<{ value: number }>>(HK.getBasalEnergyBurned, range),
      q<Array<{ value: number }>>(HK.getAppleExerciseTime, range),
      q<{ value: number }>(HK.getDistanceWalkingRunning, { date: start.toISOString(), unit: 'mile' }),
      q<Array<{ value: number }>>(HK.getRestingHeartRateSamples, { ...range, ascending: false, limit: 1 }),
      q<Array<{ value: number }>>(HK.getHeartRateVariabilitySamples, { ...range, unit: 'second' }),
      q<Array<{ value: number }>>(HK.getHeartRateSamples, { ...range, limit: 1000 }),
      // Sleep that ENDS on this day (last night): 6pm the day before → noon.
      q<Array<{ value: string; startDate: string; endDate: string }>>(HK.getSleepSamples, {
        startDate: new Date(start.getTime() - 6 * 3600 * 1000).toISOString(),
        endDate: new Date(start.getTime() + 12 * 3600 * 1000).toISOString(),
        limit: 200,
      }),
      // getSamples only handles quantity types; workouts need the anchored query.
      q<{ data?: Array<any> }>(HK.getAnchoredWorkouts, range),
      // CGM (e.g. Lingo) writes many readings a day; we send the daily average + range.
      q<Array<{ value: number }>>(HK.getBloodGlucoseSamples, { ...range, unit: 'mgPerdL', limit: 2000 }),
    ]);

  if (steps?.value) out.steps = Math.round(steps.value);
  const a = sumValues(active);
  if (a > 0) out.active_kcal = Math.round(a);
  const b = sumValues(basal);
  if (b > 0) out.resting_kcal = Math.round(b);
  const ex = sumValues(exercise);
  if (ex > 0) out.exercise_min = Math.round(ex / 60);
  if (distance?.value) out.distance_mi = Math.round(distance.value * 100) / 100;
  if (restingRows?.[0]?.value) out.resting_hr = Math.round(restingRows[0].value);
  if (hrvRows?.length) {
    out.hrv_ms = Math.round((sumValues(hrvRows) / hrvRows.length) * 1000 * 10) / 10;
  }
  if (hrRows?.length) out.avg_hr = Math.round(sumValues(hrRows) / hrRows.length);

  if (glucose?.length) {
    const vals = glucose.map((g) => Number(g.value)).filter((v) => v > 0);
    if (vals.length) {
      out.blood_glucose = Math.round(vals.reduce((x, y) => x + y, 0) / vals.length);
      out.glucose_min = Math.round(Math.min(...vals));
      out.glucose_max = Math.round(Math.max(...vals));
      out.glucose_readings = vals.length;
    }
  }

  if (sleepRows?.length) {
    const asleep = sleepRows.filter((s) => ['ASLEEP', 'CORE', 'DEEP', 'REM'].includes(s.value));
    // Merge overlapping intervals (Watch + iPhone can both write sleep).
    const spans = asleep
      .map((s) => [new Date(s.startDate).getTime(), new Date(s.endDate).getTime()] as [number, number])
      .sort((x, y) => x[0] - y[0]);
    let total = 0;
    let cur: [number, number] | null = null;
    for (const s of spans) {
      if (!cur || s[0] > cur[1]) {
        if (cur) total += cur[1] - cur[0];
        cur = [s[0], s[1]];
      } else if (s[1] > cur[1]) {
        cur[1] = s[1];
      }
    }
    if (cur) total += cur[1] - cur[0];
    if (total > 0) out.sleep_hours = Math.round((total / 3600000) * 100) / 100;
  }

  const wk = workouts?.data || [];
  lastCounts = { sleep: sleepRows?.length || 0, workouts: wk.length };
  if (wk.length) {
    out.workouts = wk.slice(0, 20).map((w) => ({
      type: String(w.activityName || w.activityId || 'Workout'),
      minutes: Math.round((Number(w.duration) || 0) / 60),
      kcal: Math.round(Number(w.calories) || 0),
      start: w.start || w.startDate || null,
    }));
  }
  return out;
}

async function latestBody(today: Date, yesterday: Date) {
  const [weight, fat] = await Promise.all([
    q<{ value: number; startDate: string }>(HK.getLatestWeight, { unit: 'pound' }),
    q<{ value: number; startDate: string }>(HK.getLatestBodyFatPercentage, {}),
  ]);
  const byDay: Record<string, Record<string, number>> = {};
  const place = (sample: { value: number; startDate: string } | null, key: string, scale = 1) => {
    if (!sample?.value || !sample.startDate) return;
    const d = localDateKey(new Date(sample.startDate));
    if (d !== localDateKey(today) && d !== localDateKey(yesterday)) return; // old reading: not this sync's business
    byDay[d] = { ...(byDay[d] || {}), [key]: Math.round(sample.value * scale * 10) / 10 };
  };
  place(weight, 'body_weight_lb');
  place(fat, 'body_fat_pct');
  return byDay;
}

let running: Promise<boolean> | null = null;

/**
 * Sync Apple Health → forgedbyfreedom.net. Safe to call often: it throttles
 * itself unless `force` is set. Resolves true if something was pushed.
 */
export function syncHealth(force = false): Promise<boolean> {
  if (running) return running;
  running = (async () => {
    if (!HK || !PERMS) {
      const msg = 'Apple Health is not available in this version of the app.';
      setStatus({ at: Date.now(), ok: false, message: msg, daysSent: 0 });
      report({ stage: 'module', hk: false, error: msg });
      return false;
    }
    if (!force) {
      const last = Number(await AsyncStorage.getItem(LAST_SYNC_KEY)) || 0;
      if (Date.now() - last < MIN_INTERVAL_MS) return false;
    }
    if (!(await init())) {
      const msg = 'Apple Health access was not granted. Open the Health app → Sharing → Apps → Forged by Freedom and turn on all categories.';
      setStatus({ at: Date.now(), ok: false, message: msg, daysSent: 0 });
      report({ stage: 'init', hk: true, init: false, error: initError });
      return false;
    }

    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const body = await latestBody(today, yesterday);

    // Oldest day to send: the day after the last fully synced day (it may have
    // been partial), never more than two weeks back, never later than yesterday.
    const lastDay = await AsyncStorage.getItem(LAST_DAY_KEY);
    const oldest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - MAX_BACKFILL_DAYS);
    let start = yesterday;
    if (!lastDay) {
      start = oldest; // first run after this update: backfill two weeks
    } else {
      const [y, m, d] = lastDay.split('-').map(Number);
      const ld = new Date(y, (m || 1) - 1, d || 1);
      if (ld < start) start = ld < oldest ? oldest : ld;
    }

    const days: Date[] = [];
    for (let d = new Date(start); d <= today; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      days.push(d);
    }
    let pushed = false;
    let sent = 0;
    let todayKeys: string[] = [];
    let yCounts = { sleep: 0, workouts: 0 };
    let totalSleepRecords = 0;
    let totalWorkouts = 0;
    let lastNightHours: number | null = null;
    for (const day of days) {
      const key = localDateKey(day);
      const values = { ...(await collectDay(day)), ...(body[key] || {}) };
      totalSleepRecords += lastCounts.sleep;
      totalWorkouts += lastCounts.workouts;
      if (key === localDateKey(today) && typeof values.sleep_hours === 'number') lastNightHours = values.sleep_hours;
      if (key === localDateKey(yesterday)) yCounts = { ...lastCounts };
      if (key === localDateKey(today)) todayKeys = Object.keys(values);
      if (!Object.keys(values).length) continue;
      await pushHealth(key, values); // throws on failure → no progress saved, retried next open
      pushed = true;
      sent++;
    }
    // Say what came across, so a missing category is obvious on the card.
    const detail =
      ` Sleep last night: ${lastNightHours != null ? `${lastNightHours} h` : 'none in Apple Health'}.` +
      ` Workouts yesterday + today: ${totalWorkouts ? totalWorkouts : 'none in Apple Health'}.`;
    setStatus({
      at: Date.now(),
      ok: sent > 0,
      message: sent
        ? `Apple Health is up to date.${detail}`
        : 'Apple Health returned no data. In the Health app → Sharing → Apps → Forged by Freedom, turn on all categories, then tap Sync now.',
      daysSent: sent,
    });
    // Counts first: the site's admin view only shows the start of this record.
    report({ stage: 'done', sleep_records: totalSleepRecords, workouts_found: totalWorkouts, last_night_h: lastNightHours, yesterday_sleep_samples: yCounts.sleep, yesterday_workouts: yCounts.workouts, days_checked: days.length, days_sent: sent, hk: true, init: true, today_keys: todayKeys.join(',') });
    // Yesterday is complete once today has started; today is redone next pass.
    await AsyncStorage.setItem(LAST_DAY_KEY, localDateKey(yesterday));
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    return pushed;
  })()
    .catch((e) => {
      console.warn('[health-sync] failed', e?.message || e);
      const msg = e?.message || String(e);
      setStatus({ at: Date.now(), ok: false, message: `Sync failed: ${msg}`, daysSent: 0 });
      report({ stage: 'error', error: msg });
      return false;
    })
    .finally(() => {
      running = null;
    });
  return running;
}
