import type { PhotoPose } from './pose';
// FBF Coach Hub API (WordPress plugin "fbf-coach-hub", namespace fbf/v1).
// Client: report plan changes, sync the day's log, weekly check-ins, bloodwork.
// Coach: clients, alerts, check-in review.
import { Platform } from 'react-native';
import { apiFetch } from './api';
import { getToken, wpApiRoot } from './wp-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const DAILY_QUEUE_KEY = 'fbf_daily_log_queue_v1';
type QueuedDaily = { day: string; log: DailyLog };

/** Re-send daily logs that failed earlier while offline. Latest entry per day wins. */
export async function flushDailyQueue(): Promise<void> {
  let queue: QueuedDaily[] = [];
  try {
    const raw = await AsyncStorage.getItem(DAILY_QUEUE_KEY);
    queue = raw ? (JSON.parse(raw) as QueuedDaily[]) : [];
  } catch {
    return;
  }
  if (!queue.length) return;
  const remaining: QueuedDaily[] = [];
  for (const item of queue) {
    try {
      await apiFetch(`/daily-log?day=${item.day}`, { method: 'POST', body: JSON.stringify(item.log) });
    } catch {
      remaining.push(item); // still offline — keep it for next time
    }
  }
  try {
    await AsyncStorage.setItem(DAILY_QUEUE_KEY, JSON.stringify(remaining));
  } catch {}
}

async function enqueueDaily(day: string, log: DailyLog): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_QUEUE_KEY);
    const queue: QueuedDaily[] = raw ? (JSON.parse(raw) as QueuedDaily[]) : [];
    const next = queue.filter((q) => q.day !== day); // one entry per day, newest wins
    next.push({ day, log });
    await AsyncStorage.setItem(DAILY_QUEUE_KEY, JSON.stringify(next.slice(-30)));
  } catch {}
}

/**
 * Send the day's log. On failure it is queued and retried on the next sync,
 * so a dropped connection never silently loses a day (it used to just warn).
 */
export async function postDailyLog(log: DailyLog, day = localDay()): Promise<void> {
  await flushDailyQueue(); // opportunistically drain anything queued while offline
  try {
    await apiFetch(`/daily-log?day=${day}`, { method: 'POST', body: JSON.stringify(log) });
  } catch (e) {
    console.warn('postDailyLog failed — queued for retry', e);
    await enqueueDaily(day, log);
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
  /** Older photos added to the timeline with the date they were taken. */
  historical?: boolean;
}

export interface HubCheckin {
  id: number;
  user_id: number;
  created_at: string;
  fields: CheckinFields;
  photos: ('front' | 'side' | 'back')[];
  photo_urls: Partial<Record<'front' | 'side' | 'back', string>>;
  /** Cached body keypoints per photo (auto alignment). */
  poses?: Partial<Record<'front' | 'side' | 'back', PhotoPose>>;
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
    throw new Error((body && body.message) || `Upload failed (${res.status})`);
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

/** Add older progress photos (taken before today) to the timeline. */
export async function submitOlderPhotos(takenOn: string, photos: Partial<Record<PhotoSlot, PickedPhoto>>, weightLbs?: number): Promise<HubCheckin> {
  const form = new FormData();
  form.append('taken_on', takenOn);
  form.append('fields', JSON.stringify(weightLbs ? { weight_lbs: weightLbs } : {}));
  for (const slot of ['front', 'side', 'back'] as PhotoSlot[]) {
    const p = photos[slot];
    if (p) await appendFile(form, slot, p, `${slot}.jpg`, 'image/jpeg');
  }
  return multipart<HubCheckin>('/checkins-v2', form);
}

/** Cache the detected body keypoints for one check-in photo. */
export async function savePose(checkinId: number, slot: PhotoSlot, pose: PhotoPose | null): Promise<void> {
  await apiFetch(`/checkins-v2/${checkinId}/pose`, { method: 'POST', body: JSON.stringify({ slot, pose }) });
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
  /** Added by the FBF Bloodwork Reader plugin (1.0+). Older reports won't have these. */
  warnings?: string[];
  partial?: boolean;
  unreadable?: number;
}

export async function extractBloodwork(file: { uri: string; name: string; type: string; file?: Blob }): Promise<LabReport> {
  const form = new FormData();
  await appendFile(form, 'file', file, file.name, file.type);
  return multipart<LabReport>('/bloodwork/extract', form);
}

/** Written analysis of a report. Needs the FBF Bloodwork Reader plugin 1.1+; returns null if the route is missing. */
export async function analyzeBloodwork(report: Pick<LabReport, 'id' | 'markers' | 'collected_on'>): Promise<string | null> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 95000);
  try {
    const res = await fetch(`${wpApiRoot}/bloodwork/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ report_id: report.id, markers: report.markers, collected_on: report.collected_on }),
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && body.message) || `Analysis failed (${res.status})`);
    return (body && body.reply) || null;
  } finally {
    clearTimeout(timer);
  }
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
  assessments?: Assessment[];
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

/* ---------------- body assessments (tape + 7-site calipers) ---------------- */

export interface AssessmentInput {
  sex: 'male' | 'female';
  age: number;
  height_in: number;
  weight_lb: number;
  tape: Record<string, number>;
  skinfolds: Record<string, number>;
}

export interface Assessment extends AssessmentInput {
  id: number;
  user_id: number;
  created_at: string;
  scan_id: number | null;
  method: 'jp7';
  sum_mm: number;
  body_density: number;
  bf_percent: number | null;
  fat_mass_lb: number | null;
  lean_mass_lb: number | null;
}

async function hubJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${wpApiRoot}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers as any) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body && body.message) || `Request failed (${res.status})`);
  return body as T;
}

/** Server validates every field and calculates body fat (JP7 + Siri). */
export async function saveAssessment(input: AssessmentInput): Promise<Assessment> {
  return hubJson<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(input) });
}

export async function linkAssessmentToScan(id: number, scanId: number): Promise<Assessment> {
  return hubJson<Assessment>(`/assessments/${id}/scan`, { method: 'POST', body: JSON.stringify({ scan_id: scanId }) });
}

export async function getAssessments(): Promise<Assessment[]> {
  const r = await hubJson<{ assessments: Assessment[] }>('/assessments');
  return r.assessments ?? [];
}
