import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

// react-native-health is iOS-only; we dynamically require it to avoid crashes on Android/web
let AppleHealthKit: any = null;
let HealthKitPermissions: any = null;

if (Platform.OS === 'ios') {
  try {
    const RNHealth = require('react-native-health');
    AppleHealthKit = RNHealth.default;
    HealthKitPermissions = {
      permissions: {
        read: [
          RNHealth.HealthKitPermission?.StepCount ?? 'StepCount',
          RNHealth.HealthKitPermission?.SleepAnalysis ?? 'SleepAnalysis',
          RNHealth.HealthKitPermission?.HeartRate ?? 'HeartRate',
          RNHealth.HealthKitPermission?.RestingHeartRate ?? 'RestingHeartRate',
          RNHealth.HealthKitPermission?.BodyTemperature ?? 'BodyTemperature',
          RNHealth.HealthKitPermission?.ActiveEnergyBurned ?? 'ActiveEnergyBurned',
          RNHealth.HealthKitPermission?.Workout ?? 'Workout',
          RNHealth.HealthKitPermission?.Weight ?? 'Weight',
          // CGM readings (e.g. Abbott Lingo) written to Apple Health
          RNHealth.HealthKitPermission?.BloodGlucose ?? 'BloodGlucose',
        ],
        write: [],
      },
    };
  } catch {
    // react-native-health not installed or not linked
  }
}

interface SleepData {
  hours: number;
  quality: number; // 1-5 scale
}

interface HeartRateData {
  resting: number;
  average: number;
}

interface WorkoutData {
  type: string;
  duration: number; // minutes
  calories: number;
}

export interface GlucoseSummary {
  average: number; // mg/dL
  min: number;
  max: number;
  latest: number;
  count: number;
}

const EMPTY_GLUCOSE: GlucoseSummary = { average: 0, min: 0, max: 0, latest: 0, count: 0 };

interface AutoPopulateResult {
  // Body wellness fields
  weight_lbs?: string;
  body_temp?: string;
  blood_glucose?: string;
  glucose_min?: string;
  glucose_max?: string;
  resting_heart_rate?: string;
  // Activity fields
  steps?: string;
  estimated_calories_burned?: string;
  training_done?: boolean;
  workout_duration_min?: string;
  avg_heart_rate?: string;
  cardio_minutes?: string;
  // Sleep fields
  sleep_hours?: number;
  sleep_quality?: number;
  // Nutrition fields
  calories?: string;
}

export function useHealthKit() {
  const [available, setAvailable] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      setAvailable(false);
      return;
    }
    setAvailable(true);

    // Check if already authorized on mount (and when app returns from Settings)
    AppleHealthKit.initHealthKit(HealthKitPermissions.permissions, (err: any) => {
      if (!err) {
        setAuthorized(true);
      }
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!AppleHealthKit || !HealthKitPermissions) return false;

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(HealthKitPermissions.permissions, (err: any) => {
        if (err) {
          console.warn('[HealthKit] Permission denied or error:', err);
          setAuthorized(false);
          resolve(false);
        } else {
          setAuthorized(true);
          resolve(true);
        }
      });
    });
  }, []);

  const getTodaySteps = useCallback(async (): Promise<number> => {
    if (!AppleHealthKit || !authorized) return 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        { date: startOfDay.toISOString(), includeManuallyAdded: true },
        (err: any, results: any) => {
          if (err) {
            console.warn('[HealthKit] Steps error:', err);
            resolve(0);
          } else {
            resolve(Math.round(results?.value ?? 0));
          }
        }
      );
    });
  }, [authorized]);

  const getTodaySleep = useCallback(async (): Promise<SleepData> => {
    if (!AppleHealthKit || !authorized) return { hours: 0, quality: 0 };

    const now = new Date();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    return new Promise((resolve) => {
      AppleHealthKit.getSleepSamples(
        {
          startDate: startOfYesterday.toISOString(),
          endDate: now.toISOString(),
          limit: 50,
        },
        (err: any, results: any[]) => {
          if (err || !results?.length) {
            resolve({ hours: 0, quality: 0 });
            return;
          }

          // Filter for ASLEEP samples (not IN_BED)
          const asleepSamples = results.filter(
            (s) => s.value === 'ASLEEP' || s.value === 'CORE' || s.value === 'DEEP' || s.value === 'REM'
          );
          const samplesToUse = asleepSamples.length > 0 ? asleepSamples : results;

          let totalMinutes = 0;
          let deepMinutes = 0;

          for (const sample of samplesToUse) {
            const start = new Date(sample.startDate).getTime();
            const end = new Date(sample.endDate).getTime();
            const mins = (end - start) / 60000;
            totalMinutes += mins;
            if (sample.value === 'DEEP' || sample.value === 'REM') {
              deepMinutes += mins;
            }
          }

          const hours = Math.round(totalMinutes / 30) / 2; // Round to nearest 0.5

          // Estimate quality 1-5 based on total sleep + deep ratio
          let quality = 3;
          if (hours >= 7.5 && deepMinutes / totalMinutes > 0.3) quality = 5;
          else if (hours >= 7) quality = 4;
          else if (hours >= 6) quality = 3;
          else if (hours >= 5) quality = 2;
          else quality = 1;

          resolve({ hours, quality });
        }
      );
    });
  }, [authorized]);

  const getTodayHeartRate = useCallback(async (): Promise<HeartRateData> => {
    if (!AppleHealthKit || !authorized) return { resting: 0, average: 0 };

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const getRestingHR = (): Promise<number> =>
      new Promise((resolve) => {
        AppleHealthKit.getRestingHeartRate(
          { startDate: startOfDay.toISOString(), endDate: now.toISOString() },
          (err: any, results: any) => {
            if (err || !results?.value) resolve(0);
            else resolve(Math.round(results.value));
          }
        );
      });

    const getAverageHR = (): Promise<number> =>
      new Promise((resolve) => {
        AppleHealthKit.getHeartRateSamples(
          {
            startDate: startOfDay.toISOString(),
            endDate: now.toISOString(),
            ascending: false,
            limit: 100,
          },
          (err: any, results: any[]) => {
            if (err || !results?.length) resolve(0);
            else {
              const sum = results.reduce((acc, s) => acc + (s.value || 0), 0);
              resolve(Math.round(sum / results.length));
            }
          }
        );
      });

    const [resting, average] = await Promise.all([getRestingHR(), getAverageHR()]);
    return { resting, average };
  }, [authorized]);

  const getTodayBodyTemp = useCallback(async (): Promise<number> => {
    if (!AppleHealthKit || !authorized) return 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return new Promise((resolve) => {
      AppleHealthKit.getBodyTemperatureSamples(
        {
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          ascending: false,
          limit: 1,
        },
        (err: any, results: any[]) => {
          if (err || !results?.length) resolve(0);
          else {
            // react-native-health returns Fahrenheit by default
            resolve(Math.round(results[0].value * 10) / 10);
          }
        }
      );
    });
  }, [authorized]);

  const getTodayCaloriesBurned = useCallback(async (): Promise<number> => {
    if (!AppleHealthKit || !authorized) return 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return new Promise((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(
        {
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          includeManuallyAdded: true,
        },
        (err: any, results: any[]) => {
          if (err || !results?.length) resolve(0);
          else {
            const total = results.reduce((acc, s) => acc + (s.value || 0), 0);
            resolve(Math.round(total));
          }
        }
      );
    });
  }, [authorized]);

  const getTodayWorkouts = useCallback(async (): Promise<WorkoutData[]> => {
    if (!AppleHealthKit || !authorized) return [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return new Promise((resolve) => {
      AppleHealthKit.getSamples(
        {
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          type: 'Workout',
        },
        (err: any, results: any[]) => {
          if (err || !results?.length) resolve([]);
          else {
            const workouts = results.map((w) => ({
              type: w.activityName || w.activityId || 'Unknown',
              duration: Math.round((w.duration || 0) / 60), // seconds to minutes
              calories: Math.round(w.calories || 0),
            }));
            resolve(workouts);
          }
        }
      );
    });
  }, [authorized]);

  // Blood glucose from a CGM (Lingo, Libre, Dexcom) via Apple Health.
  // Uses today's readings; falls back to the last 24h if today has none yet.
  // Unit MUST be mgPerdL — react-native-health defaults to mmol/L.
  const getGlucoseSummary = useCallback(async (): Promise<GlucoseSummary> => {
    if (!AppleHealthKit || !authorized) return EMPTY_GLUCOSE;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const fetchSamples = (start: Date): Promise<any[]> =>
      new Promise((resolve) => {
        AppleHealthKit.getBloodGlucoseSamples(
          {
            startDate: start.toISOString(),
            endDate: now.toISOString(),
            unit: 'mgPerdL',
            ascending: false,
            limit: 1000,
          },
          (err: any, results: any[]) => {
            if (err || !results?.length) resolve([]);
            else resolve(results);
          }
        );
      });

    let samples = await fetchSamples(startOfDay);
    if (samples.length === 0) samples = await fetchSamples(last24h);

    const values = samples
      .map((s) => Number(s.value))
      .filter((v) => Number.isFinite(v) && v > 20 && v < 600); // drop sensor noise
    if (values.length === 0) return EMPTY_GLUCOSE;

    const sum = values.reduce((a, v) => a + v, 0);
    return {
      average: Math.round(sum / values.length),
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      latest: Math.round(values[0]), // samples are newest-first
      count: values.length,
    };
  }, [authorized]);

  const autoPopulateCheckin = useCallback(async (): Promise<AutoPopulateResult> => {
    if (!authorized) {
      const granted = await requestPermission();
      if (!granted) return {};
    }

    const [steps, sleep, heartRate, bodyTemp, caloriesBurned, workouts, glucose] = await Promise.all([
      getTodaySteps(),
      getTodaySleep(),
      getTodayHeartRate(),
      getTodayBodyTemp(),
      getTodayCaloriesBurned(),
      getTodayWorkouts(),
      getGlucoseSummary(),
    ]);

    const result: AutoPopulateResult = {};

    if (glucose.count > 0) {
      result.blood_glucose = String(glucose.average);
      result.glucose_min = String(glucose.min);
      result.glucose_max = String(glucose.max);
    }

    if (steps > 0) result.steps = String(steps);
    if (sleep.hours > 0) {
      result.sleep_hours = sleep.hours;
      result.sleep_quality = sleep.quality;
    }
    if (heartRate.resting > 0) result.resting_heart_rate = String(heartRate.resting);
    if (heartRate.average > 0) result.avg_heart_rate = String(heartRate.average);
    if (bodyTemp > 0) result.body_temp = String(bodyTemp);
    if (caloriesBurned > 0) result.estimated_calories_burned = String(caloriesBurned);

    if (workouts.length > 0) {
      result.training_done = true;
      const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
      result.workout_duration_min = String(totalDuration);
      const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);
      if (totalCalories > 0 && !result.estimated_calories_burned) {
        result.estimated_calories_burned = String(totalCalories);
      }
    }

    return result;
  }, [
    authorized,
    requestPermission,
    getTodaySteps,
    getTodaySleep,
    getTodayHeartRate,
    getTodayBodyTemp,
    getTodayCaloriesBurned,
    getTodayWorkouts,
    getGlucoseSummary,
  ]);

  // For non-iOS platforms, return a stub
  if (Platform.OS !== 'ios') {
    return {
      available: false,
      authorized: false,
      requestPermission: async () => false,
      getTodaySteps: async () => 0,
      getTodaySleep: async () => ({ hours: 0, quality: 0 }),
      getTodayHeartRate: async () => ({ resting: 0, average: 0 }),
      getTodayBodyTemp: async () => 0,
      getTodayCaloriesBurned: async () => 0,
      getTodayWorkouts: async () => [] as WorkoutData[],
      getGlucoseSummary: async () => EMPTY_GLUCOSE,
      autoPopulateCheckin: async () => ({} as AutoPopulateResult),
    };
  }

  return {
    available,
    authorized,
    requestPermission,
    getTodaySteps,
    getTodaySleep,
    getTodayHeartRate,
    getTodayBodyTemp,
    getTodayCaloriesBurned,
    getTodayWorkouts,
    getGlucoseSummary,
    autoPopulateCheckin,
  };
}
