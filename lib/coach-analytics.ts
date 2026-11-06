// Coach analytics — compliance, progress and feel roll-up for a coach's clients.
// Backed by GET /fbf/v1/coach/analytics (FBF Coach Hub).
import { api } from './api';

export interface AnalyticsWeight {
  first: number | null;
  last: number | null;
  delta: number | null;
  points: number[];
  n: number;
}

export interface AnalyticsClient {
  id: number;
  name: string;
  avatar_url: string | null;
  plan: string;
  weight: AnalyticsWeight;
  feel: { mood: number | null; stress: number | null; sleep: number | null };
  intake: { calories: number | null; protein_g: number | null; water_oz: number | null };
  compliance: {
    window_days: number;
    logged_days: number;
    meals_eaten: number;
    meals_planned: number;
    trained_days: number;
    water_avg: number | null;
  };
  scores: Record<string, number> | null;
  last_checkin: string | null;
  flags: string[];
}

export interface CoachAnalyticsResponse {
  coach: { id: number; name: string; is_head: boolean };
  window_days: number;
  generated_at: string;
  clients: AnalyticsClient[];
}

export async function getCoachAnalytics(days = 30): Promise<CoachAnalyticsResponse> {
  return api.get<CoachAnalyticsResponse>(`/coach/analytics?days=${days}`);
}
