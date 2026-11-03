// Compound catalog now lives in lib/compounds.ts.

export const TRAINING_TYPES = [
  'Push',
  'Pull',
  'Legs',
  'Upper',
  'Lower',
  'Full Body',
  'Biceps',
  'Triceps',
  'Chest',
  'Back',
  'Shoulders',
  'Core',
  'BJJ',
  'Cardio Only',
  'Other',
] as const;

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Excellent',
};

export const MOOD_LABELS: Record<number, string> = {
  1: 'Awful',
  2: 'Bad',
  3: 'Poor',
  4: 'Below Average',
  5: 'Neutral',
  6: 'Decent',
  7: 'Good',
  8: 'Great',
  9: 'Excellent',
  10: 'Amazing',
};

export const STRESS_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Very Low',
  3: 'Low',
  4: 'Mild',
  5: 'Moderate',
  6: 'Elevated',
  7: 'High',
  8: 'Very High',
  9: 'Severe',
  10: 'Extreme',
};

/**
 * Default FBF workout program — 4-day upper/lower rotating split.
 * Dumbbells/machines over barbells for pressing (per FBF coaching standard).
 * Saturday & Sunday are optional rest/active recovery days.
 * Used as the standard template for new clients unless a custom program is specified.
 */
export const DEFAULT_WORKOUT_PROGRAM = [
  {
    day: 'Day A — Upper Push (Chest/Shoulders/Triceps)',
    exercises: [
      { name: 'Dumbbell Incline Press (30-45°)', sets: '4', reps: '8-10', rest: '90s' },
      { name: 'Machine Chest Press (slow eccentric)', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Dumbbell Shoulder Press, Seated', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Cable Lateral Raise (behind body)', sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Tricep Rope Pushdown', sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Overhead Dumbbell Tricep Extension', sets: '3', reps: '10-12', rest: '45s' },
    ],
  },
  {
    day: 'Day B — Lower Quad Focus',
    exercises: [
      { name: 'Leg Press (shoulder width, full depth)', sets: '4', reps: '10-12', rest: '90s' },
      { name: 'Hack Squat or Pendulum Squat', sets: '3', reps: '10-12', rest: '90s' },
      { name: 'Leg Extension (1s pause at top)', sets: '3', reps: '12-15', rest: '60s' },
      { name: 'Walking Dumbbell Lunges', sets: '3', reps: '12/leg', rest: '60s' },
      { name: 'Seated Calf Raise (2s pause at stretch)', sets: '4', reps: '12-15', rest: '45s' },
    ],
  },
  {
    day: 'Day C — Upper Pull (Back/Biceps)',
    exercises: [
      { name: 'Lat Pulldown, Wide Grip', sets: '4', reps: '8-10', rest: '90s' },
      { name: 'Seated Cable Row (V-handle)', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Dumbbell Row, Single Arm (bench supported)', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Machine Rear Delt Fly', sets: '3', reps: '15-20', rest: '45s' },
      { name: 'Dumbbell Bicep Curl (alternating)', sets: '3', reps: '10-12', rest: '45s' },
      { name: 'Incline Dumbbell Hammer Curl (45° bench)', sets: '3', reps: '10-12', rest: '45s' },
    ],
  },
  {
    day: 'Day D — Lower Posterior (Hamstrings/Glutes)',
    exercises: [
      { name: 'Romanian Dumbbell Deadlift', sets: '4', reps: '8-10', rest: '90s' },
      { name: 'Lying Leg Curl (slow release)', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Hip Thrust (2s pause at top)', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Bulgarian Split Squat (dumbbells)', sets: '3', reps: '10/leg', rest: '60s' },
      { name: 'Standing Calf Raise (full ROM)', sets: '4', reps: '10-12', rest: '45s' },
    ],
  },
];
