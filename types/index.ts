export interface SupplementItem {
  name: string;
  dose: string;
  frequency: string;
}

export interface PedItem {
  compound: string;
  dose: string;
  frequency: string;
  route: string;
}

export interface PeptideItem {
  name: string;
  dose: string;
  frequency: string;
  timing: string;
}

export interface WorkoutExercise {
  name: string;
  sets: string | number;
  reps: string;
  rest?: string;
  notes?: string;
}

export interface WorkoutDay {
  day: string;
  name?: string;
  dayOfWeek?: string;
  exercises: WorkoutExercise[];
}

// Workout logging types
export interface WorkoutSet {
  set_number: number;
  target_reps: string;
  weight_lbs: string;
  actual_reps: string;
  completed: boolean;
  is_pr?: boolean;
}

export interface ExerciseLog {
  exercise_name: string;
  exercise_note?: string;
  sets: WorkoutSet[];
}

export interface BJJSession {
  type: 'gi' | 'no-gi' | 'both';
  rounds: number;
  round_length_min: number;
  rest_between_min: number;
  drill_time_min: number;
  intensity: 'light' | 'moderate' | 'hard';
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  day_name: string;
  started_at: string;
  completed_at?: string;
  duration_min?: number;
  exercises: ExerciseLog[];
  total_volume_lbs: number;
  notes?: string;
  prs_hit: PersonalRecord[];
  bjj_session?: BJJSession;
}

export interface PersonalRecord {
  exercise_name: string;
  weight_lbs: number;
  reps: number;
  estimated_1rm: number;
  date: string;
  previous_best?: number;
}

export interface CardioProtocol {
  phase: string;
  duration: string;
}

export interface MedicalProtocol {
  name: string;
  dose: string;
  frequency: string;
  notes: string;
}

export interface Client {
  id: string;
  organization_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  timezone: string;
  target_calories: number | null;
  target_protein: number | null;
  target_steps: number | null;
  target_carbs: number | null;
  target_fats: number | null;
  is_active: boolean;
  leaderboard_opt_in: boolean;
  weigh_in_day: string;
  current_supplements: SupplementItem[];
  current_peds: PedItem[];
  current_peptides: PeptideItem[];
  meal_plan: any[] | null;
  workout_program: WorkoutDay[] | null;
  cardio_protocol: CardioProtocol[] | null;
  medical_protocol: MedicalProtocol[] | null;
  last_weight?: number | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  client_id: string;
  date: string;
  weight_lbs: number | null;
  body_temp: number | null;
  blood_glucose: number | null;
  resting_heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  mood_rating: number | null;
  mood_notes: string | null;
  stress_level: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_oz: number | null;
  steps: number | null;
  training_done: boolean;
  training_type: string | null;
  workout_notes: string | null;
  workout_description: string | null;
  workout_voice_transcript: string | null;
  rpe: number | null;
  performance_rating: number | null;
  cardio_minutes: number | null;
  workout_duration_min: number | null;
  avg_heart_rate: number | null;
  estimated_calories_burned: number | null;
  supplement_compliance: boolean;
  supplements_json: SupplementItem[] | null;
  ped_log_json: PedItem[] | null;
  side_effects_notes: string | null;
  progress_photo_urls: string[] | null;
  general_notes: string | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  sleep_time: string | null;
  wake_time: string | null;
  created_at: string;
}

export interface CheckinFormData {
  weight_lbs: string;
  body_temp: string;
  blood_glucose: string;
  resting_heart_rate: string;
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  mood_rating: number;
  mood_notes: string;
  stress_level: number;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  water_oz: number;
  steps: string;
  training_done: boolean;
  training_type: string[];
  workout_notes: string;
  workout_description: string;
  rpe: string;
  performance_rating: string;
  cardio_minutes: string;
  workout_duration_min: string;
  avg_heart_rate: string;
  estimated_calories_burned: string;
  sleep_hours: number;
  sleep_quality: number;
  sleep_time: string;
  wake_time: string;
  supplement_compliance: boolean;
  supplements_json: SupplementItem[];
  ped_log_json: PedItem[];
  side_effects_notes: string;
  progress_photo_urls: string[];
  general_notes: string;
  // Recommendation opt-ins
  recommendation_opt_ins: Record<string, boolean>;
  // BJJ fields
  bjj_done: boolean;
  bjj_type: string;
  bjj_rounds: string;
  bjj_round_min: string;
  bjj_rest_min: string;
  bjj_drill_min: string;
  bjj_intensity: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'group' | 'dm';
  organization_id: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  attachment_url?: string | null;
  attachment_type?: 'image' | 'file' | null;
  attachment_name?: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ClientMetrics {
  id: string;
  client_id: string;
  adherence_7d: number | null;
  avg_calories_7d: number | null;
  avg_protein_7d: number | null;
  avg_steps_7d: number | null;
  avg_sleep_7d: number | null;
  avg_mood_7d: number | null;
  avg_stress_7d: number | null;
  avg_water_7d: number | null;
  supplement_compliance_7d: number | null;
  weight_current: number | null;
  weight_delta_7d: number | null;
  weight_delta_30d: number | null;
  status: 'green' | 'yellow' | 'red';
  open_flags_count: number;
  updated_at: string;
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'streak' | 'checkins' | 'targets' | 'lifestyle';
  icon: string;
  threshold_json: Record<string, unknown>;
  sort_order: number;
}

export interface EarnedBadge extends BadgeDefinition {
  earned_at: string;
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  total_checkins: number;
  last_checkin_date?: string | null;
}

export interface LeaderboardEntry {
  client_id: string;
  name: string;
  current_streak: number;
  best_streak: number;
  total_checkins: number;
  badge_count: number;
  adherence_7d: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
}

export interface BodyScan {
  id: string;
  client_id: string;
  scan_date: string;
  scan_type: 'inbody' | 'dexa' | 'bodpod' | 'calipers' | 'other';
  body_fat_pct: number | null;
  lean_mass_lbs: number | null;
  fat_mass_lbs: number | null;
  total_weight_lbs: number | null;
  skeletal_muscle_mass_lbs: number | null;
  body_water_lbs: number | null;
  bmi: number | null;
  visceral_fat_level: number | null;
  basal_metabolic_rate: number | null;
  right_arm_lbs: number | null;
  left_arm_lbs: number | null;
  trunk_lbs: number | null;
  right_leg_lbs: number | null;
  left_leg_lbs: number | null;
  scan_file_url: string | null;
  notes: string | null;
  created_at: string;
}

export type UserRole = 'org_admin' | 'coach' | null;

export interface AdminClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  target_calories: number | null;
  target_protein: number | null;
  target_steps: number | null;
  target_carbs: number | null;
  target_fats: number | null;
  weigh_in_day: string;
  created_at: string;
  client_coach_assignments: {
    coach_user_id: string;
    is_active: boolean;
    profiles: { full_name: string | null; email: string } | null;
  }[];
  client_metrics: {
    status: 'green' | 'yellow' | 'red';
    adherence_7d: number | null;
  }[] | null;
}

export interface OrgCoach {
  user_id: string;
  role: string;
  client_count: number;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface FoodLogEntry {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
  quantity: number;
  meal_label: string;
  timestamp: string;
  source: 'manual' | 'meal_plan' | 'barcode';
}

export interface DailyFoodLog {
  date: string;
  entries: FoodLogEntry[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

export type ChallengeType =
  | 'weight_loss_pct'
  | 'body_fat_pct'
  | 'strength_gain_pct'
  | 'steps'
  | 'adherence'
  | 'custom';

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  start_date: string;
  end_date: string;
  duration_weeks: number;
  entry_fee_cents?: number;
  prize_pool_description?: string;
  rules: string[];
  metric_label: string;
  created_at: string;
  participant_count: number;
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  client_id: string;
  client_name: string;
  baseline_value: number;
  current_value: number;
  change_pct: number;
  rank: number;
  verified: boolean;
  joined_at: string;
}

export interface ClientMeResponse {
  client: Client | null;
  userRole: UserRole;
  organizationId: string | null;
  metrics: ClientMetrics | null;
  recentCheckins: Checkin[];
  streak: StreakData;
  earnedBadges: EarnedBadge[];
  allBadges: BadgeDefinition[];
}
