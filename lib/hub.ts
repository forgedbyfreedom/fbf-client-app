// FBF Coach Hub API (WordPress plugin "fbf-coach-hub", namespace fbf/v1).
// Client: report plan changes, sync the day's log, weekly check-ins, bloodwork.
// Coach: clients, alerts, check-in review.
import { Platform } from 'react-native';
import { apiFetch } from './api';
import { getToken, wpApiRoot } from './wp-auth';

export type ChangeArea = 'meal plan' | 'workout' | 'supplements' | 'targets' | 'protocol';

/** Tell the coach a client changed their plan. Never throws — a failed alert must not block the client. */
export async function reportChange(area: ChangeArea, summary: string, details: string[] = []): Promise<void> {
  try {
    await apiFetch('/changes', {
      method: 'POST',
      body: JSON.stringify({ area, summary: summary.slice(0, 300), details: details.slice(0, 30) }),
    });
  } catch (e) {
    console.warn('reportChange failed', e);
  }
}

export interface DailyLog {
  meals_planned?: number;
  meals_eaten?: number;
  off_plan_meals?: number;
  water_oz?: number;
  water_target_oz?: number;
  training_day?: boolean;
  trained?: boolean;
  training_skipped?: boolean;
  workout_name?: string;
  workout_minutes?: number;
  supplements_planned?: number;
  supplements_taken?: number;
  steps?: number;
}

export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function postDailyLog(log: DailyLog, day = localDay()): Promise<void> {
  try {
    await apiFetch(`/daily-log?day=${day}`, { method: 'POST', body: JSON.stringify(log) });
  } catch (e) {
    console.warn('postDailyLog failed', e);
  }
}

export interface DailyRow {
  day: string;
  data: DailyLog;
  shortfalls: string[];
}

export async function getDailyLog(days = 14): Promise<DailyRow[]> {
  const r = await apiFetch<{ days: DailyRow[] }>(`/daily-log?days=${days}`);
  return r.days ?? [];
}

/* ---------------- weekly check-ins ---------------- */

export interface CheckinFields {
  weight_lbs?: number;
  sleep_hours?: number;
  cardio_minutes?: number;
  training_week?: string;
  scores?: Record<string, number>;
  score_notes?: Record<string, string>;
  notes?: string;
  protocol_notes?: string;
  wins?: string;
  struggles?: string;
}

export interface HubCheckin {
  id: number;
  user_id: number;
  created_at: string;
  fields: CheckinFields;
  photos: ('front' | 'side' | 'back')[];
  photo_urls: Partial<Record<'front' | 'side' | 'back', string>>;
  feedback: string | null;
  feedback_at: string | null;
}

export type PhotoSlot = 'front' | 'side' | 'back';
export interface PickedPhoto {
  uri: string;
  /** Web only: the File/Blob picked in the browser. */
  file?: Blob;
}

async function multipart<T>(path: string, form: FormData): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${wpApiRoot}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'Your session expired. Please sign in again.' : (body && body.message) || `Upload failed (${res.status})`);
  }
  return body as T;
}

async function appendFile(form: FormData, field: string, p: PickedPhoto | { uri: string; file?: Blob; name: string; type: string }, fallbackName: string, fallbackType: string) {
  const name = (p as any).name || fallbackName;
  const type = (p as any).type || fallbackType;
  if (Platform.OS === 'web') {
    const blob = p.file ?? (await (await fetch(p.uri)).blob());
    form.append(field, blob, name);
  } else {
    // React Native's FormData accepts { uri, name, type } descriptors.
    form.append(field, { uri: p.uri, name, type } as any);
  }
}

export async function submitCheckin(fields: CheckinFields, photos: Partial<Record<PhotoSlot, PickedPhoto>>): Promise<HubCheckin> {
  const form = new FormData();
  form.append('fields', JSON.stringify(fields));
  for (const slot of ['front', 'side', 'back'] as PhotoSlot[]) {
    const p = photos[slot];
    if (p) await appendFile(form, slot, p, `${slot}.jpg`, 'image/jpeg');
  }
  return multipart<HubCheckin>('/checkins-v2', form);
}

export async function getCheckins(): Promise<HubCheckin[]> {
  const r = await apiFetch<{ checkins: HubCheckin[] }>('/checkins-v2');
  return r.checkins ?? [];
}

/* ---------------- bloodwork ---------------- */

export interface LabMarker {
  name: string;
  value: number | string;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: 'low' | 'high' | 'normal' | null;
  panel: string | null;
}

export interface LabReport {
  id: string;
  lab: string | null;
  collected_on: string | null;
  uploaded_at: string;
  filename: string;
  markers: LabMarker[];
}

export async function extractBloodwork(file: { uri: string; name: string; type: string; file?: Blob }): Promise<LabReport> {
  const form = new FormData();
  await appendFile(form, 'file', file, file.name, file.type);
  return multipart<LabReport>('/bloodwork/extract', form);
}

export async function getBloodworkHistory(): Promise<LabReport[]> {
  const r = await apiFetch<{ reports: LabReport[] }>('/bloodwork/history');
  return r.reports ?? [];
}

/* ---------------- coach ---------------- */

export interface CoachMe {
  is_coach: boolean;
  is_head_coach: boolean;
}

export async function getCoachMe(): Promise<CoachMe> {
  try {
    return await apiFetch<CoachMe>('/coach/me');
  } catch {
    return { is_coach: false, is_head_coach: false };
  }
}

export interface CoachClient {
  id: number;
  name: string;
  email: string;
  coach_id: number | null;
  coach_name: string | null;
  alerts_7d: number;
  last_checkin_at: string | null;
  last_weight: number | null;
  today: DailyRow | null;
  avatar_url?: string | null;
}

export async function getCoachClients(): Promise<CoachClient[]> {
  const r = await apiFetch<{ clients: CoachClient[] }>('/coach/clients');
  return r.clients ?? [];
}

export interface HubEvent {
  id: number;
  kind: 'change' | 'miss' | 'checkin' | 'bloodwork' | string;
  severity: string;
  summary: string;
  details?: unknown;
  created_at: string;
  client_id?: number;
  client_name?: string;
  client_avatar_url?: string | null;
}

export interface CoachClientDetail {
  client: { id: number; name: string; email: string; avatar_url?: string | null };
  daily: DailyRow[];
  events: HubEvent[];
  checkins: HubCheckin[];
  bloodwork: LabReport[];
}

export async function getCoachClient(id: number): Promise<CoachClientDetail> {
  return apiFetch<CoachClientDetail>(`/coach/clients/${id}`);
}

export async function getCoachAlerts(): Promise<HubEvent[]> {
  const r = await apiFetch<{ alerts: HubEvent[] }>('/coach/alerts');
  return r.alerts ?? [];
}

export async function sendCheckinFeedback(checkinId: number, feedback: string): Promise<HubCheckin> {
  return apiFetch<HubCheckin>(`/coach/checkins/${checkinId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
}

export interface AiStats {
  sources: string;
  words: string;
  passages: number;
}

export async function getAiStats(): Promise<AiStats | null> {
  try {
    return await apiFetch<AiStats>('/coach/stats');
  } catch {
    return null;
  }
}

/* ---------------- profile picture ---------------- */

export interface HubProfile {
  id: number;
  name: string;
  avatar_url: string | null;
  coach: { id: number; name: string; avatar_url: string | null } | null;
  /** All assigned coaches (a client can have several). */
  coaches?: { id: number; name: string; avatar_url: string | null }[];
}

export async function getProfile(): Promise<HubProfile> {
  return apiFetch<HubProfile>('/profile');
}

export async function uploadAvatar(photo: PickedPhoto): Promise<string | null> {
  const form = new FormData();
  await appendFile(form, 'photo', photo, 'avatar.jpg', 'image/jpeg');
  const r = await multipart<{ avatar_url: string | null }>('/profile/avatar', form);
  return r.avatar_url;
}

export async function deleteAvatar(): Promise<void> {
  await apiFetch('/profile/avatar', { method: 'DELETE' });
}

/* ---------------- voice (speech-to-text on the server) ---------------- */

export async function transcribeAudio(clip: { uri: string; file?: Blob; name: string; type: string }, context: 'meal' = 'meal'): Promise<string> {
  const form = new FormData();
  form.append('context', context);
  await appendFile(form, 'audio', clip, clip.name, clip.type);
  const r = await multipart<{ text: string }>('/voice/transcribe', form);
  return r.text;
}
