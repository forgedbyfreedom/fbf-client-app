import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { api } from '../lib/api';
import {
  WorkoutDay,
  ExerciseLog,
  WorkoutLog,
  PersonalRecord,
} from '../types';
import {
  createWorkoutLog,
  calculateTotalVolume,
  detectPRs,
  formatDayName,
  PRCategory,
} from '../lib/workout-utils';

const DRAFT_KEY_PREFIX = 'fbf-workout-draft';
const LOGS_KEY_PREFIX = 'fbf-workout-logs';
const PRS_KEY_PREFIX = 'fbf-workout-prs';

interface UseWorkoutLogReturn {
  // Current workout state
  exercises: ExerciseLog[];
  isWorkoutActive: boolean;
  startedAt: string | null;
  elapsedSeconds: number;

  // Actions
  startWorkout: (day: WorkoutDay) => void;
  updateSet: (exerciseIndex: number, setIndex: number, field: 'weight_lbs' | 'actual_reps', value: string) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  finishWorkout: (notes?: string) => Promise<{ log: WorkoutLog; newPRs: PersonalRecord[] }>;
  cancelWorkout: () => void;

  // History & PRs
  workoutLogs: WorkoutLog[];
  personalRecords: Record<PRCategory, PersonalRecord | null>;
  prHistory: PersonalRecord[];
  loadHistory: () => Promise<void>;

  // PR alerts
  latestPRAlerts: PersonalRecord[];
  clearPRAlerts: () => void;

  // Loading
  loading: boolean;
}

export function useWorkoutLog(): UseWorkoutLogReturn {
  const { client } = useAuth();
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentDay, setCurrentDay] = useState<WorkoutDay | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [personalRecords, setPersonalRecords] = useState<Record<PRCategory, PersonalRecord | null>>({
    bench: null,
    squat: null,
    deadlift: null,
  });
  const [prHistory, setPRHistory] = useState<PersonalRecord[]>([]);
  const [latestPRAlerts, setLatestPRAlerts] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restored = useRef(false);

  const clientId = client?.id;

  // Storage keys
  const draftKey = clientId ? `${DRAFT_KEY_PREFIX}-${clientId}` : null;
  const logsKey = clientId ? `${LOGS_KEY_PREFIX}-${clientId}` : null;
  const prsKey = clientId ? `${PRS_KEY_PREFIX}-${clientId}` : null;

  // Timer effect
  useEffect(() => {
    if (isWorkoutActive && startedAt) {
      timerRef.current = setInterval(() => {
        const start = new Date(startedAt).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isWorkoutActive, startedAt]);

  // Restore draft on mount
  useEffect(() => {
    if (!draftKey || restored.current) return;
    restored.current = true;

    AsyncStorage.getItem(draftKey).then((saved) => {
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.exercises && draft.startedAt) {
            setExercises(draft.exercises);
            setStartedAt(draft.startedAt);
            setCurrentDay(draft.currentDay || null);
            setIsWorkoutActive(true);
          }
        } catch {
          // ignore corrupt draft
        }
      }
    });
  }, [draftKey]);

  // Save draft on exercise changes
  useEffect(() => {
    if (!draftKey || !isWorkoutActive) return;
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(
        draftKey,
        JSON.stringify({ exercises, startedAt, currentDay })
      );
    }, 500);
    return () => clearTimeout(timeout);
  }, [exercises, startedAt, currentDay, draftKey, isWorkoutActive]);

  // Load history and PRs
  const loadHistory = useCallback(async () => {
    if (!logsKey || !prsKey) return;
    setLoading(true);
    try {
      // Try API first
      try {
        const apiLogs = await api.get<{ logs: WorkoutLog[] }>('/api/client/workout-logs');
        if (apiLogs?.logs?.length) {
          setWorkoutLogs(apiLogs.logs);
          await AsyncStorage.setItem(logsKey, JSON.stringify(apiLogs.logs));
        } else {
          throw new Error('No API data');
        }
      } catch {
        // Fall back to local storage
        const localLogs = await AsyncStorage.getItem(logsKey);
        if (localLogs) {
          setWorkoutLogs(JSON.parse(localLogs));
        }
      }

      // Load PRs from local storage (always local as source of truth)
      const localPRs = await AsyncStorage.getItem(prsKey);
      if (localPRs) {
        const parsed = JSON.parse(localPRs);
        setPersonalRecords(parsed.current || { bench: null, squat: null, deadlift: null });
        setPRHistory(parsed.history || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [logsKey, prsKey]);

  // Load on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startWorkout = useCallback((day: WorkoutDay) => {
    const logs = createWorkoutLog(day);
    setExercises(logs);
    setCurrentDay(day);
    setStartedAt(new Date().toISOString());
    setIsWorkoutActive(true);
    setElapsedSeconds(0);
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: 'weight_lbs' | 'actual_reps', value: string) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const sets = [...exercise.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      exercise.sets = sets;
      updated[exerciseIndex] = exercise;
      return updated;
    });
  }, []);

  const toggleSetComplete = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const sets = [...exercise.sets];
      sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
      exercise.sets = sets;
      updated[exerciseIndex] = exercise;
      return updated;
    });
  }, []);

  const finishWorkout = useCallback(async (notes?: string) => {
    if (!logsKey || !prsKey || !draftKey) {
      throw new Error('No client context');
    }

    const completedAt = new Date().toISOString();
    const totalVolume = calculateTotalVolume(exercises);
    const durationMin = startedAt
      ? Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000)
      : 0;

    // Detect PRs
    const newPRs = detectPRs(exercises, personalRecords);

    // Mark PR sets
    const updatedExercises = exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((set) => {
        const isPR = newPRs.some(
          (pr) => pr.exercise_name === ex.exercise_name &&
                  pr.weight_lbs === parseFloat(set.weight_lbs) &&
                  pr.reps === parseInt(set.actual_reps, 10)
        );
        return { ...set, is_pr: isPR };
      }),
    }));

    const log: WorkoutLog = {
      id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString().split('T')[0],
      day_name: currentDay ? formatDayName(currentDay) : 'Workout',
      started_at: startedAt || completedAt,
      completed_at: completedAt,
      duration_min: durationMin,
      exercises: updatedExercises,
      total_volume_lbs: totalVolume,
      notes,
      prs_hit: newPRs,
    };

    // Update local logs
    const updatedLogs = [log, ...workoutLogs];
    setWorkoutLogs(updatedLogs);
    await AsyncStorage.setItem(logsKey, JSON.stringify(updatedLogs));

    // Update PRs
    const updatedPRs = { ...personalRecords };
    const updatedHistory = [...prHistory];
    for (const pr of newPRs) {
      const category = (await import('../lib/workout-utils')).getPRCategory(pr.exercise_name);
      if (category) {
        updatedPRs[category] = pr;
        updatedHistory.push(pr);
      }
    }
    setPersonalRecords(updatedPRs);
    setPRHistory(updatedHistory);
    await AsyncStorage.setItem(prsKey, JSON.stringify({ current: updatedPRs, history: updatedHistory }));

    // Set PR alerts
    if (newPRs.length > 0) {
      setLatestPRAlerts(newPRs);
    }

    // Clear draft
    await AsyncStorage.removeItem(draftKey);

    // Try to sync to API
    try {
      await api.post('/api/client/workout-logs', log);
    } catch {
      // Offline - already saved locally
    }

    // Reset state
    setExercises([]);
    setIsWorkoutActive(false);
    setStartedAt(null);
    setCurrentDay(null);
    setElapsedSeconds(0);

    return { log, newPRs };
  }, [exercises, startedAt, currentDay, workoutLogs, personalRecords, prHistory, logsKey, prsKey, draftKey]);

  const cancelWorkout = useCallback(async () => {
    setExercises([]);
    setIsWorkoutActive(false);
    setStartedAt(null);
    setCurrentDay(null);
    setElapsedSeconds(0);
    if (draftKey) {
      await AsyncStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  const clearPRAlerts = useCallback(() => {
    setLatestPRAlerts([]);
  }, []);

  return {
    exercises,
    isWorkoutActive,
    startedAt,
    elapsedSeconds,
    startWorkout,
    updateSet,
    toggleSetComplete,
    finishWorkout,
    cancelWorkout,
    workoutLogs,
    personalRecords,
    prHistory,
    loadHistory,
    latestPRAlerts,
    clearPRAlerts,
    loading,
  };
}
