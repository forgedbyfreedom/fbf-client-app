import { WorkoutDay, WorkoutExercise, ExerciseLog, WorkoutSet, WorkoutLog, PersonalRecord } from '../types';

// Days of the week mapping
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get the current day of the week as a string
 */
export function getTodayDayOfWeek(): string {
  return DAYS_OF_WEEK[new Date().getDay()];
}

/**
 * Match today's workout from the program based on dayOfWeek field or day index
 */
export function getTodaysWorkout(program: WorkoutDay[] | null): WorkoutDay | null {
  if (!program || program.length === 0) return null;

  const today = getTodayDayOfWeek();

  // First try matching by dayOfWeek field
  const byDayOfWeek = program.find(
    (d) => d.dayOfWeek?.toLowerCase() === today.toLowerCase()
  );
  if (byDayOfWeek) return byDayOfWeek;

  // Fallback: try matching by day name containing the day of week
  const byDayName = program.find(
    (d) => d.day?.toLowerCase().includes(today.toLowerCase()) ||
           d.name?.toLowerCase().includes(today.toLowerCase())
  );
  if (byDayName) return byDayName;

  return null;
}

/**
 * Calculate estimated 1RM using Epley formula: weight x (1 + reps/30)
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate total volume (weight x reps) for a workout log
 */
export function calculateTotalVolume(exercises: ExerciseLog[]): number {
  let total = 0;
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (set.completed) {
        const weight = parseFloat(set.weight_lbs) || 0;
        const reps = parseInt(set.actual_reps, 10) || 0;
        total += weight * reps;
      }
    }
  }
  return total;
}

/**
 * Create an empty exercise log from a program exercise
 */
export function createExerciseLog(exercise: WorkoutExercise): ExerciseLog {
  const numSets = typeof exercise.sets === 'number'
    ? exercise.sets
    : parseInt(String(exercise.sets), 10) || 3;

  const sets: WorkoutSet[] = [];
  for (let i = 1; i <= numSets; i++) {
    sets.push({
      set_number: i,
      target_reps: exercise.reps || '8-10',
      weight_lbs: '',
      actual_reps: '',
      completed: false,
      is_pr: false,
    });
  }

  return {
    exercise_name: exercise.name,
    exercise_note: exercise.notes || undefined,
    sets,
  };
}

/**
 * Create exercise logs for a full workout day
 */
export function createWorkoutLog(day: WorkoutDay): ExerciseLog[] {
  return day.exercises.map(createExerciseLog);
}

/**
 * Format workout day name for display
 */
export function formatDayName(day: WorkoutDay): string {
  if (day.name) {
    return `${day.day} — ${day.name}`;
  }
  return day.day;
}

// PR-tracked exercise categories
const BENCH_EXERCISES = [
  'bench press',
  'dumbbell bench press',
  'barbell bench press',
  'machine chest press',
  'flat bench press',
  'incline bench press',
  'dumbbell incline press',
  'flat dumbbell press',
];

const SQUAT_EXERCISES = [
  'squat',
  'back squat',
  'front squat',
  'hack squat',
  'leg press',
  'barbell squat',
  'goblet squat',
];

const DEADLIFT_EXERCISES = [
  'deadlift',
  'romanian deadlift',
  'dumbbell deadlift',
  'sumo deadlift',
  'conventional deadlift',
  'barbell deadlift',
  'trap bar deadlift',
];

export type PRCategory = 'bench' | 'squat' | 'deadlift';

/**
 * Determine the PR category for an exercise name, if any
 */
export function getPRCategory(exerciseName: string): PRCategory | null {
  const lower = exerciseName.toLowerCase().trim();
  if (BENCH_EXERCISES.some((e) => lower.includes(e) || e.includes(lower))) return 'bench';
  if (SQUAT_EXERCISES.some((e) => lower.includes(e) || e.includes(lower))) return 'squat';
  if (DEADLIFT_EXERCISES.some((e) => lower.includes(e) || e.includes(lower))) return 'deadlift';
  return null;
}

/**
 * Get the display name for a PR category
 */
export function getPRCategoryName(category: PRCategory): string {
  switch (category) {
    case 'bench': return 'Bench Press';
    case 'squat': return 'Squat';
    case 'deadlift': return 'Deadlift';
  }
}

/**
 * Detect new PRs from a completed workout by comparing against existing PR records
 */
export function detectPRs(
  exercises: ExerciseLog[],
  existingPRs: Record<PRCategory, PersonalRecord | null>
): PersonalRecord[] {
  const newPRs: PersonalRecord[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const exercise of exercises) {
    const category = getPRCategory(exercise.exercise_name);
    if (!category) continue;

    for (const set of exercise.sets) {
      if (!set.completed) continue;
      const weight = parseFloat(set.weight_lbs);
      const reps = parseInt(set.actual_reps, 10);
      if (!weight || !reps) continue;

      const estimated1rm = calculateEpley1RM(weight, reps);
      const existing = existingPRs[category];
      const existingBest = existing?.estimated_1rm ?? 0;

      if (estimated1rm > existingBest) {
        // Check if we already detected a PR in this category from this workout
        const existingNewPR = newPRs.find((pr) => getPRCategory(pr.exercise_name) === category);
        if (existingNewPR) {
          if (estimated1rm > existingNewPR.estimated_1rm) {
            existingNewPR.exercise_name = exercise.exercise_name;
            existingNewPR.weight_lbs = weight;
            existingNewPR.reps = reps;
            existingNewPR.estimated_1rm = estimated1rm;
            existingNewPR.previous_best = existingBest || undefined;
          }
        } else {
          newPRs.push({
            exercise_name: exercise.exercise_name,
            weight_lbs: weight,
            reps,
            estimated_1rm: estimated1rm,
            date: today,
            previous_best: existingBest || undefined,
          });
        }
      }
    }
  }

  return newPRs;
}

/**
 * Format duration from minutes to a readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format a number with commas
 */
export function formatVolume(volume: number): string {
  return volume.toLocaleString();
}
