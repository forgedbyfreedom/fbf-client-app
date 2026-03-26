/**
 * Demo/preview data for the FBF Client App.
 * Provides realistic sample data showing what a fully active client
 * looks like after 3 months of consistent check-ins.
 */
import {
  Client,
  ClientMetrics,
  Checkin,
  StreakData,
  EarnedBadge,
  BadgeDefinition,
  ClientMeResponse,
  SupplementItem,
  WorkoutDay,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random based on a seed so demo data is stable */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function randomInRange(min: number, max: number, seed: number): number {
  return min + seededRandom(seed) * (max - min);
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function uuid(index: number): string {
  const hex = index.toString(16).padStart(8, '0');
  return `demo-${hex}-0000-4000-a000-000000000000`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_CLIENT_ID = 'demo-client-00000001';
const DEMO_ORG_ID = 'demo-org-00000001';
const DEMO_USER_ID = 'demo-user-00000001';
const TODAY = new Date('2026-03-14');

// ---------------------------------------------------------------------------
// 1. Sample Client
// ---------------------------------------------------------------------------

const demoSupplements: SupplementItem[] = [
  { name: 'Creatine Monohydrate', dose: '5g', frequency: 'Daily' },
  { name: 'Fish Oil (EPA/DHA)', dose: '2g', frequency: 'Daily' },
  { name: 'Vitamin D3', dose: '5000 IU', frequency: 'Daily' },
  { name: 'Magnesium Glycinate', dose: '400mg', frequency: 'Before bed' },
  { name: 'Whey Protein Isolate', dose: '30g', frequency: 'Post-workout' },
];

const demoWorkoutProgram: WorkoutDay[] = [
  {
    day: 'Monday',
    exercises: [
      { name: 'Barbell Bench Press', sets: '4', reps: '6-8' },
      { name: 'Incline Dumbbell Press', sets: '3', reps: '8-10' },
      { name: 'Cable Flyes', sets: '3', reps: '12-15' },
      { name: 'Overhead Press', sets: '4', reps: '6-8' },
      { name: 'Lateral Raises', sets: '3', reps: '12-15' },
      { name: 'Tricep Pushdowns', sets: '3', reps: '10-12' },
    ],
  },
  {
    day: 'Tuesday',
    exercises: [
      { name: 'Barbell Back Squat', sets: '4', reps: '5-6' },
      { name: 'Romanian Deadlift', sets: '3', reps: '8-10' },
      { name: 'Leg Press', sets: '3', reps: '10-12' },
      { name: 'Walking Lunges', sets: '3', reps: '12 each' },
      { name: 'Leg Curls', sets: '3', reps: '12-15' },
      { name: 'Standing Calf Raises', sets: '4', reps: '15-20' },
    ],
  },
  {
    day: 'Thursday',
    exercises: [
      { name: 'Barbell Rows', sets: '4', reps: '6-8' },
      { name: 'Weighted Pull-Ups', sets: '3', reps: '6-8' },
      { name: 'Seated Cable Rows', sets: '3', reps: '10-12' },
      { name: 'Face Pulls', sets: '3', reps: '15-20' },
      { name: 'Barbell Curls', sets: '3', reps: '10-12' },
      { name: 'Hammer Curls', sets: '3', reps: '10-12' },
    ],
  },
  {
    day: 'Friday',
    exercises: [
      { name: 'Conventional Deadlift', sets: '4', reps: '3-5' },
      { name: 'Front Squat', sets: '3', reps: '6-8' },
      { name: 'Bulgarian Split Squats', sets: '3', reps: '10 each' },
      { name: 'Hip Thrusts', sets: '3', reps: '10-12' },
      { name: 'Hanging Leg Raises', sets: '3', reps: '12-15' },
      { name: 'Plank Hold', sets: '3', reps: '45-60s' },
    ],
  },
];

export const demoClient: Client = {
  id: DEMO_CLIENT_ID,
  organization_id: DEMO_ORG_ID,
  user_id: DEMO_USER_ID,
  first_name: 'Marcus',
  last_name: 'Rivera',
  email: 'marcus.rivera@demo.fbf.app',
  phone: '+15551234567',
  timezone: 'America/New_York',
  target_calories: 2400,
  target_protein: 210,
  target_steps: 10000,
  target_carbs: 260,
  target_fats: 65,
  is_active: true,
  leaderboard_opt_in: true,
  weigh_in_day: 'Monday',
  current_supplements: demoSupplements,
  current_peds: [],
  current_peptides: [],
  workout_program: demoWorkoutProgram,
  cardio_protocol: [
    { phase: 'Steady-state', duration: '25 min post-lift' },
    { phase: 'LISS walk', duration: '30 min on rest days' },
  ],
  medical_protocol: null,
  last_weight: 192.4,
  created_at: '2025-12-14T08:00:00Z',
};

// ---------------------------------------------------------------------------
// 2. Client Metrics
// ---------------------------------------------------------------------------

export const demoMetrics: ClientMetrics = {
  id: uuid(9000),
  client_id: DEMO_CLIENT_ID,
  adherence_7d: 92,
  avg_calories_7d: 2350,
  avg_protein_7d: 205,
  avg_steps_7d: 9800,
  avg_sleep_7d: 7.2,
  avg_mood_7d: 7.5,
  avg_stress_7d: 3.2,
  avg_water_7d: 88,
  supplement_compliance_7d: 95,
  weight_current: 192.4,
  weight_delta_7d: -0.8,
  weight_delta_30d: -3.2,
  status: 'green',
  open_flags_count: 0,
  updated_at: '2026-03-14T06:00:00Z',
};

// ---------------------------------------------------------------------------
// 3. 90 Days of Check-ins
// ---------------------------------------------------------------------------

// Training schedule: Mon(push), Tue(legs), Wed(rest/cardio), Thu(pull), Fri(lower), Sat(rest/active), Sun(rest)
const trainingDayConfig: Record<number, { type: string; desc: string } | null> = {
  1: { type: 'Push - Chest/Shoulders/Triceps', desc: 'Bench 225x6, incline DB 80sx8, OHP 135x7. Good session, hit PR on bench.' },
  2: { type: 'Legs - Quad Dominant', desc: 'Squat 275x5, RDL 225x8, leg press 450x10. Legs were toast.' },
  3: null, // rest or light cardio
  4: { type: 'Pull - Back/Biceps', desc: 'Rows 185x7, pull-ups +25x7, cable rows 160x10. Back pumps were insane.' },
  5: { type: 'Lower - Deadlift Focus', desc: 'Deadlift 315x4, front squat 185x6, BSS 40sx10. Grip held strong today.' },
  6: null, // rest - active recovery
  0: null, // Sunday rest
};

function generateCheckins(): Checkin[] {
  const checkins: Checkin[] = [];

  for (let i = 0; i < 90; i++) {
    const date = new Date(TODAY);
    date.setDate(date.getDate() - (89 - i)); // day 0 = 90 days ago, day 89 = today
    const dayOfWeek = date.getDay(); // 0=Sun .. 6=Sat
    const seed = i * 137 + 42;

    // Progress curve: weight goes from 198 -> 192 over 90 days
    // Not perfectly linear -- some stalls, slight regain in middle
    const progressPct = i / 89;
    const weightTrend = 198 - 6 * progressPct;
    // Add weekly fluctuation (water weight) and daily noise
    const weeklyFlux = Math.sin((i / 7) * Math.PI * 2) * 0.6;
    const dailyNoise = randomInRange(-0.5, 0.5, seed);
    const weight = roundTo(weightTrend + weeklyFlux + dailyNoise, 1);

    // Occasional "off day" - about 1 in 10
    const isOffDay = seededRandom(seed + 999) < 0.1;

    // Training
    const trainingConfig = trainingDayConfig[dayOfWeek];
    const trainingDone = trainingConfig !== null && !isOffDay;

    // Workout descriptions vary slightly based on progress
    let workoutDesc = trainingConfig?.desc ?? null;
    let trainingType = trainingConfig?.type ?? null;

    // Sometimes on "rest" days, they do cardio
    const restDayCardio = !trainingConfig && seededRandom(seed + 50) > 0.4;

    if (restDayCardio && !isOffDay) {
      trainingType = 'Active Recovery / Cardio';
      workoutDesc = dayOfWeek === 3
        ? '30 min incline treadmill walk at 3.5mph, 10% incline. Felt good, loosened up.'
        : '25 min easy bike ride and 15 min stretching. Recovery day.';
    }

    // Calories: mostly on target, some off days
    const calorieBase = isOffDay
      ? randomInRange(1800, 2800, seed + 1)
      : randomInRange(2200, 2500, seed + 1);
    const calories = Math.round(calorieBase);

    // Protein: correlates somewhat with calories
    const proteinBase = isOffDay
      ? randomInRange(150, 190, seed + 2)
      : randomInRange(195, 225, seed + 2);
    const protein = Math.round(proteinBase);

    // Carbs and fats to roughly add up
    const remainingCals = calories - (protein * 4);
    const fatCals = randomInRange(0.3, 0.4, seed + 3) * remainingCals;
    const fat = Math.round(fatCals / 9);
    const carbs = Math.round((remainingCals - fatCals) / 4);

    // Steps
    const stepsBase = isOffDay
      ? randomInRange(5000, 8000, seed + 4)
      : randomInRange(8500, 12500, seed + 4);
    const steps = Math.round(stepsBase);

    // Sleep improves slightly over the 90 days
    const sleepTrend = 6.8 + 0.5 * progressPct;
    const sleepNoise = randomInRange(-0.5, 0.8, seed + 5);
    const sleepHours = roundTo(Math.max(5.5, Math.min(9.0, sleepTrend + sleepNoise)), 1);

    // Sleep quality 5-10
    const sleepQuality = Math.round(Math.min(10, Math.max(5, sleepHours - 0.5 + randomInRange(0, 2, seed + 55))));

    // Mood improves over time
    const moodBase = isOffDay
      ? randomInRange(5, 7, seed + 6)
      : 6.5 + 1.5 * progressPct + randomInRange(-0.5, 1, seed + 6);
    const mood = Math.round(Math.min(9, Math.max(4, moodBase)));

    // Stress decreases over time
    const stressBase = isOffDay
      ? randomInRange(4, 6, seed + 7)
      : 4.5 - 1.5 * progressPct + randomInRange(-0.5, 1, seed + 7);
    const stress = Math.round(Math.min(7, Math.max(1, stressBase)));

    // Water oz
    const waterBase = isOffDay
      ? randomInRange(60, 80, seed + 8)
      : randomInRange(80, 105, seed + 8);
    const water = Math.round(waterBase);

    // Body temp
    const bodyTemp = roundTo(randomInRange(97.6, 98.6, seed + 9), 1);

    // Supplement compliance: high overall, occasional miss
    const suppCompliant = seededRandom(seed + 10) > 0.08;

    // RPE for training days
    const rpe = trainingDone ? Math.round(randomInRange(6, 9, seed + 11)) : null;
    const perfRating = trainingDone ? Math.round(randomInRange(6, 9, seed + 12)) : null;
    const cardioMin = trainingDone ? Math.round(randomInRange(20, 35, seed + 13)) : (restDayCardio && !isOffDay ? Math.round(randomInRange(25, 40, seed + 13)) : null);
    const workoutDuration = trainingDone ? Math.round(randomInRange(55, 80, seed + 14)) : (restDayCardio && !isOffDay ? Math.round(randomInRange(30, 45, seed + 14)) : null);

    // Sleep/wake times
    const sleepHour = Math.round(randomInRange(21, 23, seed + 15));
    const sleepMin = Math.round(randomInRange(0, 59, seed + 16));
    const wakeHour = Math.round(randomInRange(5, 7, seed + 17));
    const wakeMin = Math.round(randomInRange(0, 59, seed + 18));

    // Mood notes - occasional
    let moodNotes: string | null = null;
    if (isOffDay) {
      const offDayNotes = [
        'Rough night, toddler was up at 3am.',
        'Long day at work, skipped the gym.',
        'Feeling under the weather, took it easy.',
        'Traveled for work, ate out for most meals.',
        'Just needed a mental health day.',
      ];
      moodNotes = offDayNotes[Math.floor(seededRandom(seed + 20) * offDayNotes.length)];
    } else if (seededRandom(seed + 21) > 0.8) {
      const goodNotes = [
        'Feeling great, energy was through the roof today.',
        'Solid day all around. Sleep was on point.',
        'PR day! Feeling strong and motivated.',
        'Really dialed in on nutrition today.',
        'Good focus at work and in the gym.',
        'Recovery is on point, joints feel great.',
      ];
      moodNotes = goodNotes[Math.floor(seededRandom(seed + 22) * goodNotes.length)];
    }

    // General notes - occasional
    let generalNotes: string | null = null;
    if (seededRandom(seed + 23) > 0.85) {
      const notes = [
        'Need to order more protein powder.',
        'Felt a twinge in my left shoulder on bench, keeping an eye on it.',
        'Meal prep Sunday was a game changer this week.',
        'Noticed my pants are fitting looser, progress is real.',
        'Coach adjusted my carbs up slightly, feeling more energy in training.',
        'Started adding 10min sauna post-workout, loving it.',
        'Blood pressure was 118/74 this morning.',
        'Hit a new 5RM on squat today!',
      ];
      generalNotes = notes[Math.floor(seededRandom(seed + 24) * notes.length)];
    }

    // Skip about 6 days total (no check-in) to get 84 total checkins
    // Skip days ~15, 28, 35, 52, 61, 73
    const skipDays = [14, 27, 34, 51, 60, 72];
    if (skipDays.includes(i)) continue;

    const checkin: Checkin = {
      id: uuid(i),
      client_id: DEMO_CLIENT_ID,
      date: formatDate(date),
      weight_lbs: weight,
      body_temp: bodyTemp,
      blood_glucose: null,
      resting_heart_rate: Math.round(randomInRange(56, 68, seed + 30)),
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      mood_rating: mood,
      mood_notes: moodNotes,
      stress_level: stress,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      water_oz: water,
      steps,
      training_done: trainingDone || (restDayCardio && !isOffDay),
      training_type: trainingType,
      workout_notes: null,
      workout_description: workoutDesc,
      workout_voice_transcript: null,
      rpe,
      performance_rating: perfRating,
      cardio_minutes: cardioMin,
      workout_duration_min: workoutDuration,
      avg_heart_rate: trainingDone ? Math.round(randomInRange(130, 160, seed + 31)) : null,
      estimated_calories_burned: trainingDone ? Math.round(randomInRange(350, 550, seed + 32)) : null,
      supplement_compliance: suppCompliant,
      supplements_json: demoSupplements,
      ped_log_json: null,
      side_effects_notes: null,
      progress_photo_urls: null,
      general_notes: generalNotes,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      sleep_time: `${sleepHour.toString().padStart(2, '0')}:${sleepMin.toString().padStart(2, '0')}`,
      wake_time: `${wakeHour.toString().padStart(2, '0')}:${wakeMin.toString().padStart(2, '0')}`,
      created_at: new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString(), // ~7am submission
    };

    checkins.push(checkin);
  }

  return checkins;
}

export const demoCheckins: Checkin[] = generateCheckins();

// ---------------------------------------------------------------------------
// 4. Streak Data
// ---------------------------------------------------------------------------

export const demoStreak: StreakData = {
  current_streak: 12,
  best_streak: 28,
  total_checkins: 84,
  last_checkin_date: '2026-03-14',
};

// ---------------------------------------------------------------------------
// 5. Badges
// ---------------------------------------------------------------------------

export const demoAllBadges: BadgeDefinition[] = [
  {
    id: uuid(5001),
    slug: 'first-checkin',
    name: 'First Step',
    description: 'Complete your first check-in',
    category: 'checkins',
    icon: 'footsteps-outline',
    threshold_json: { total_checkins: 1 },
    sort_order: 1,
  },
  {
    id: uuid(5002),
    slug: 'streak-7',
    name: 'One Week Warrior',
    description: 'Maintain a 7-day check-in streak',
    category: 'streak',
    icon: 'flame-outline',
    threshold_json: { streak: 7 },
    sort_order: 2,
  },
  {
    id: uuid(5003),
    slug: 'streak-14',
    name: 'Two Week Titan',
    description: 'Maintain a 14-day check-in streak',
    category: 'streak',
    icon: 'flame',
    threshold_json: { streak: 14 },
    sort_order: 3,
  },
  {
    id: uuid(5004),
    slug: 'streak-28',
    name: 'Monthly Machine',
    description: 'Maintain a 28-day check-in streak',
    category: 'streak',
    icon: 'bonfire-outline',
    threshold_json: { streak: 28 },
    sort_order: 4,
  },
  {
    id: uuid(5005),
    slug: 'checkins-30',
    name: 'Consistent Client',
    description: 'Complete 30 total check-ins',
    category: 'checkins',
    icon: 'checkmark-done-outline',
    threshold_json: { total_checkins: 30 },
    sort_order: 5,
  },
  {
    id: uuid(5006),
    slug: 'checkins-60',
    name: 'Dedicated',
    description: 'Complete 60 total check-ins',
    category: 'checkins',
    icon: 'ribbon-outline',
    threshold_json: { total_checkins: 60 },
    sort_order: 6,
  },
  {
    id: uuid(5007),
    slug: 'protein-hit-7',
    name: 'Protein Pro',
    description: 'Hit your protein target 7 days in a row',
    category: 'targets',
    icon: 'barbell-outline',
    threshold_json: { protein_streak: 7 },
    sort_order: 7,
  },
  {
    id: uuid(5008),
    slug: 'steps-hit-7',
    name: 'Step Master',
    description: 'Hit your step goal 7 days in a row',
    category: 'targets',
    icon: 'walk-outline',
    threshold_json: { steps_streak: 7 },
    sort_order: 8,
  },
  {
    id: uuid(5009),
    slug: 'sleep-champ',
    name: 'Sleep Champion',
    description: 'Average 7+ hours of sleep for 14 consecutive days',
    category: 'lifestyle',
    icon: 'moon-outline',
    threshold_json: { sleep_avg_14d: 7 },
    sort_order: 9,
  },
  {
    id: uuid(5010),
    slug: 'supplement-streak',
    name: 'Supplement Soldier',
    description: '100% supplement compliance for 14 days straight',
    category: 'lifestyle',
    icon: 'medkit-outline',
    threshold_json: { supplement_streak: 14 },
    sort_order: 10,
  },
  {
    id: uuid(5011),
    slug: 'weight-loss-5',
    name: 'Five Down',
    description: 'Lose 5 lbs from your starting weight',
    category: 'targets',
    icon: 'trending-down-outline',
    threshold_json: { weight_loss: 5 },
    sort_order: 11,
  },
  {
    id: uuid(5012),
    slug: 'hydration-hero',
    name: 'Hydration Hero',
    description: 'Drink 80+ oz of water for 14 consecutive days',
    category: 'lifestyle',
    icon: 'water-outline',
    threshold_json: { water_streak_14d: 80 },
    sort_order: 12,
  },
  {
    id: uuid(5013),
    slug: 'checkins-90',
    name: 'Quarter Century',
    description: 'Complete 90 total check-ins',
    category: 'checkins',
    icon: 'trophy-outline',
    threshold_json: { total_checkins: 90 },
    sort_order: 13,
  },
  {
    id: uuid(5014),
    slug: 'iron-will',
    name: 'Iron Will',
    description: 'Train 5 days a week for 4 consecutive weeks',
    category: 'targets',
    icon: 'shield-checkmark-outline',
    threshold_json: { training_weeks_4x5: 4 },
    sort_order: 14,
  },
];

// Marcus has earned 8 of the 14 badges
const earnedSlugs = [
  'first-checkin',
  'streak-7',
  'streak-14',
  'streak-28',
  'checkins-30',
  'checkins-60',
  'protein-hit-7',
  'steps-hit-7',
];

const earnedDates: Record<string, string> = {
  'first-checkin': '2025-12-15T07:12:00Z',
  'streak-7': '2025-12-21T07:08:00Z',
  'streak-14': '2025-12-28T07:22:00Z',
  'streak-28': '2026-01-11T07:05:00Z',
  'checkins-30': '2026-01-14T07:18:00Z',
  'checkins-60': '2026-02-14T07:30:00Z',
  'protein-hit-7': '2026-01-08T07:15:00Z',
  'steps-hit-7': '2026-02-02T07:10:00Z',
};

export const demoEarnedBadges: EarnedBadge[] = demoAllBadges
  .filter((b) => earnedSlugs.includes(b.slug))
  .map((b) => ({
    ...b,
    earned_at: earnedDates[b.slug] ?? '2026-01-01T00:00:00Z',
  }));

// ---------------------------------------------------------------------------
// 6. Bundled ClientMeResponse
// ---------------------------------------------------------------------------

export const demoClientMeResponse: ClientMeResponse = {
  client: demoClient,
  userRole: null,
  organizationId: DEMO_ORG_ID,
  metrics: demoMetrics,
  recentCheckins: demoCheckins,
  streak: demoStreak,
  earnedBadges: demoEarnedBadges,
  allBadges: demoAllBadges,
};
