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
  sets: string;
  reps: string;
}

export interface WorkoutDay {
  day: string;
  exercises: WorkoutExercise[];
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
  estimated_calories_burned: number | null;
  supplement_compliance: boolean;
  supplements_json: SupplementItem[] | null;
  ped_log_json: PedItem[] | null;
  side_effects_notes: string | null;
  progress_photo_urls: string[] | null;
  general_notes: string | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  created_at: string;
}

export interface CheckinFormData {
  weight_lbs: string;
  body_temp: string;
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
  estimated_calories_burned: string;
  sleep_hours: number;
  sleep_quality: number;
  supplement_compliance: boolean;
  supplements_json: SupplementItem[];
  ped_log_json: PedItem[];
  side_effects_notes: string;
  progress_photo_urls: string[];
  general_notes: string;
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

export interface ClientMeResponse {
  client: Client;
  metrics: ClientMetrics | null;
  recentCheckins: Checkin[];
  streak: StreakData;
  earnedBadges: EarnedBadge[];
  allBadges: BadgeDefinition[];
}
