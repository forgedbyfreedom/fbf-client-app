/**
 * Posing Studio — competitor posing practice and coach review.
 *
 *   GET  /fbf/v1/posing/poses        mandatory-pose library by division
 *   GET  /fbf/v1/posing/mine         this athlete's clips + coach feedback
 *   POST /fbf/v1/posing/submit       multipart: video clip + division + pose + note
 *   GET  /fbf/v1/posing/queue        coach: clips from their clients awaiting review
 *   POST /fbf/v1/posing/review       coach: feedback + status (+ optional score) for a clip
 *
 * The clip is reviewed by the coach exactly like a weekly check-in: nothing is
 * auto-graded. A division's mandatory poses come from the server when it's live
 * and fall back to POSE_LIBRARY below so the screen always works offline.
 * Works on iOS/Android (file URI) and on the web app (File/Blob).
 */
import { Platform } from 'react-native';
import { getToken, wpApiRoot } from './wp-auth';

export type PosingStatus = 'submitted' | 'reviewed' | 'approved' | 'needs_work';

export interface PoseDef {
  key: string;
  label: string;
  tip: string;
}

export interface Division {
  key: string;
  label: string;
  poses: PoseDef[];
}

export interface PosingSubmission {
  id: number;
  division: string;
  division_label: string | null;
  pose: string;
  pose_label: string | null;
  status: PosingStatus;
  note: string | null;
  video_url: string | null;
  thumb_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  coach_name: string | null;
  feedback: string | null;
  score: number | null;
}

export interface MinePosing {
  submissions: PosingSubmission[];
  divisions: Division[];
  default_division: string | null;
}

export interface QueueAthlete {
  client_id: number;
  client_name: string;
  client_avatar_url: string | null;
  submissions: PosingSubmission[];
}

export interface PosingQueue {
  awaiting: number;
  athletes: QueueAthlete[];
}

export interface PickedClip {
  uri: string;
  file?: Blob; // web only
  size?: number | null;
  name?: string;
  type?: string;
}

/**
 * Canonical mandatory-pose library (NPC / IFBB-style), used as the offline
 * fallback and the default the server seeds from. Keep keys stable — the
 * server stores them.
 */
export const POSE_LIBRARY: Division[] = [
  {
    key: 'mens_physique',
    label: "Men's Physique",
    poses: [
      { key: 'front', label: 'Front', tip: 'One hand on the hip, slight torso twist. Show the V-taper, flare the lats, keep the waist tight.' },
      { key: 'back', label: 'Back', tip: 'Hand on the hip, spread the lats wide, drop the near shoulder slightly. Hold the board (shorts) square.' },
    ],
  },
  {
    key: 'classic_physique',
    label: 'Classic Physique',
    poses: [
      { key: 'front_dblbi', label: 'Front double biceps', tip: 'Crunch the arms down a touch, spread the lats, flex the quads, breathe into the chest — not up into the shoulders.' },
      { key: 'side_chest', label: 'Side chest', tip: 'Near leg forward on the calf, squeeze the hands, lift the chest, press the rear calf.' },
      { key: 'back_dblbi', label: 'Back double biceps', tip: 'Spread the lats, raise the near heel, sweep the hamstrings and calves into the pose.' },
      { key: 'abs_thigh', label: 'Abdominals & thighs', tip: 'Hands behind the head, one leg forward, exhale and crunch the abs down, flex the quad.' },
      { key: 'vacuum', label: 'Vacuum', tip: 'Exhale fully, pull the navel to the spine under the ribcage, hands on the hips or overhead.' },
      { key: 'classic_favorite', label: 'Classic / most muscular', tip: 'Your chosen classic pose — show your best line and hold it steady.' },
    ],
  },
  {
    key: 'mens_bodybuilding',
    label: "Men's Bodybuilding",
    poses: [
      { key: 'front_dblbi', label: 'Front double biceps', tip: 'Crunch arms down, spread lats, flex quads and calves, keep the waist pulled in.' },
      { key: 'front_lat', label: 'Front lat spread', tip: 'Thumbs into the obliques, flare the lats wide, lift the chest, flex the legs.' },
      { key: 'side_chest', label: 'Side chest', tip: 'Near leg forward on the calf, grip the hands, lift the chest, press the triceps.' },
      { key: 'side_tricep', label: 'Side triceps', tip: 'Lock the arms behind, press the triceps, chest up, flex the near leg.' },
      { key: 'back_dblbi', label: 'Back double biceps', tip: 'Spread lats, flex biceps, raise a heel, bring hamstrings and calves in.' },
      { key: 'back_lat', label: 'Back lat spread', tip: 'Thumbs on the lower lats, flare wide, flex hamstrings and calves.' },
      { key: 'abs_thigh', label: 'Abdominals & thighs', tip: 'Hands behind the head, exhale, crunch the abs, flex one quad forward.' },
      { key: 'most_muscular', label: 'Most muscular', tip: 'Crab or hands-on-hips — bring everything in hard, traps up, breathe first.' },
    ],
  },
  {
    key: 'bikini',
    label: "Women's Bikini",
    poses: [
      { key: 'front', label: 'Front', tip: 'One leg forward, weight back, hip tilt, long neck, relaxed shoulders. Light and confident.' },
      { key: 'back', label: 'Back', tip: 'Hands on the hips or one on the thigh, arch the lower back, point the toe to lengthen the leg.' },
    ],
  },
  {
    key: 'wellness',
    label: "Women's Wellness",
    poses: [
      { key: 'front', label: 'Front', tip: 'Feet apart, slight squat to fill the quads, hands on the hips, shoulders back, lower body forward.' },
      { key: 'back', label: 'Back', tip: 'Hips loaded, glutes and hamstrings engaged, arch the back, chin up.' },
    ],
  },
  {
    key: 'figure',
    label: "Women's Figure",
    poses: [
      { key: 'front', label: 'Front', tip: 'Quarter turn, hands off the hips, spread the lats, flex the quads, long waist.' },
      { key: 'back', label: 'Back', tip: 'Spread the lats wide, pull the waist in, flex hamstrings and calves, point a toe.' },
    ],
  },
  {
    key: 'womens_physique',
    label: "Women's Physique",
    poses: [
      { key: 'front_dblbi', label: 'Front double biceps', tip: 'Open the lats, flex the arms, flex the quads, keep the waist tight and the line long.' },
      { key: 'side_chest', label: 'Side chest', tip: 'Near leg forward, lift the chest, bring the arms in, press the rear calf.' },
      { key: 'back_dblbi', label: 'Back double biceps', tip: 'Spread the lats, flex the biceps, raise a heel, sweep hamstrings and calves in.' },
      { key: 'abs_thigh', label: 'Abdominals & thighs', tip: 'Hands behind the head, exhale, crunch the abs, flex one quad.' },
    ],
  },
  {
    key: 'other',
    label: 'Other / free posing',
    poses: [
      { key: 'front', label: 'Front', tip: 'Your front presentation — show your best line and hold it steady.' },
      { key: 'back', label: 'Back', tip: 'Your back presentation — spread wide and hold.' },
      { key: 'routine', label: 'Routine / free', tip: 'Run your transitions. Smooth, controlled, and in time.' },
    ],
  },
];

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Please log in again.');
  return { Authorization: `Bearer ${token}` };
}

/** Division key → label, for display when the server doesn't echo one. */
export function divisionLabel(key: string, divisions: Division[] = POSE_LIBRARY): string {
  return divisions.find((d) => d.key === key)?.label ?? key;
}

/** Pose key → label within a division. */
export function poseLabel(divisionKey: string, poseKey: string, divisions: Division[] = POSE_LIBRARY): string {
  const d = divisions.find((x) => x.key === divisionKey);
  return d?.poses.find((p) => p.key === poseKey)?.label ?? poseKey;
}

/** Mandatory-pose library. Server first, static fallback if it isn't live. */
export async function getDivisions(): Promise<Division[]> {
  try {
    const res = await fetch(`${wpApiRoot}/posing/poses`, { headers: await authHeaders() });
    if (!res.ok) return POSE_LIBRARY;
    const j = await res.json();
    const list = Array.isArray(j?.divisions) ? j.divisions : Array.isArray(j) ? j : null;
    if (list && list.length) return list as Division[];
    return POSE_LIBRARY;
  } catch {
    return POSE_LIBRARY;
  }
}

/** This athlete's clips and coach feedback. */
export async function listMine(): Promise<MinePosing> {
  const res = await fetch(`${wpApiRoot}/posing/mine`, { headers: await authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Could not load your posing clips (${res.status})`);
  const divisions = Array.isArray(body.divisions) && body.divisions.length ? (body.divisions as Division[]) : POSE_LIBRARY;
  return {
    submissions: (body.submissions ?? []) as PosingSubmission[],
    divisions,
    default_division: body.default_division ?? null,
  };
}

export async function submitPose(
  clip: PickedClip,
  fields: { division: string; pose: string; note?: string }
): Promise<{ id: number; status: string; message: string }> {
  const form = new FormData();
  const name = clip.name || 'posing.mp4';
  const type = clip.type || (name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
  if (Platform.OS === 'web') {
    const blob = clip.file ?? (await (await fetch(clip.uri)).blob());
    form.append('video', blob, name);
  } else {
    form.append('video', { uri: clip.uri, name, type } as any);
  }
  form.append('division', fields.division);
  form.append('pose', fields.pose);
  if (fields.note) form.append('note', fields.note);

  const res = await fetch(`${wpApiRoot}/posing/submit`, { method: 'POST', headers: await authHeaders(), body: form });
  const body = await res.json().catch(() => ({}));
  if (res.status === 413) throw new Error('That clip is too large. Keep each pose to 10–20 seconds.');
  if (!res.ok) throw new Error(body?.message ?? `Upload failed (${res.status})`);
  return body;
}

/* ---------------- coach side ---------------- */

export async function reviewQueue(): Promise<PosingQueue> {
  const res = await fetch(`${wpApiRoot}/posing/queue`, { headers: await authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Could not load the posing queue (${res.status})`);
  return { awaiting: body.awaiting ?? 0, athletes: (body.athletes ?? []) as QueueAthlete[] };
}

export async function reviewSubmission(
  id: number,
  review: { feedback: string; status: 'approved' | 'needs_work'; score?: number | null }
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${wpApiRoot}/posing/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ id, feedback: review.feedback, status: review.status, score: review.score ?? null }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message ?? `Could not send review (${res.status})`);
  return { ok: true, message: body?.message ?? 'Review sent.' };
}

/** UI helpers for status chips. */
export function statusMeta(s: PosingStatus): { label: string; tone: 'gold' | 'green' | 'yellow' | 'muted' } {
  switch (s) {
    case 'approved':
      return { label: 'Stage ready', tone: 'green' };
    case 'needs_work':
      return { label: 'Needs work', tone: 'yellow' };
    case 'reviewed':
      return { label: 'Reviewed', tone: 'gold' };
    default:
      return { label: 'Awaiting review', tone: 'muted' };
  }
}
