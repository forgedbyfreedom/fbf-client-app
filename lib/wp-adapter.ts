/**
 * Adapts WordPress App Bridge payloads into the shapes the app's screens
 * already consume (ClientMeResponse and friends).
 *
 * WP GET /client/me returns a flat legacy payload:
 *   { id, name, email, status, program_name, program_raw_text,
 *     workout_program, meal_plan, last_checkin }
 * WP GET /checkins returns:
 *   { checkins: [{ date, time, weight, waist, water_oz, cardio_min,
 *                  trained, notes }] }
 */

import { apiFetch } from './api';
import {
  Checkin,
  Client,
  ClientMeResponse,
  StreakData,
  WorkoutDay,
  WorkoutExercise,
} from '../types';

interface WPMe {
  id: number;
  name: string;
  email: string;
  status: string;
  program_name: string;
  program_raw_text: string;
  workout_program: string;
  meal_plan: string;
  last_checkin: string;
}

interface WPCheckin {
  date?: string;
  time?: string;
  weight?: number | null;
  waist?: number | null;
  water_oz?: number | null;
  cardio_min?: number | null;
  trained?: boolean;
  notes?: string;
}

/**
 * Best-effort parse of a coach-written plain-text program into WorkoutDay[].
 * FBF programs use "DAY 1 — CHEST/TRICEPS" style headers with hyphen
 * bullets like "- Dumbbell bench press — 4 x 8-10". Anything that doesn't
 * parse cleanly still reaches the client via the fallback single-day list.
 */
export function parseProgramText(text: string): WorkoutDay[] | null {
  if (!text || !text.trim()) return null;
  const lines = text.split(/\r?\n/);
  const days: WorkoutDay[] = [];
  let current: WorkoutDay | null = null;
  let inTraining = true;
  const dayNumRe = /^\s*(?:[-•*]\s*)?day\s*(\d+)\s*[:\-–—]?\s*(.*)$/i;
  const weekdayRe = /^\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:\-–—]\s*(.*)$/i;
  // "- Name — 4 x 8-10" (bulleted) OR "Name 5x12-15" / "Name 3x20 steps" (plain)
  const exBulletRe = /^\s*[-•*]\s*(.+?)\s*(?:[—:–-]\s*(\d+)\s*[x×]\s*([\d\s\-–to]+(?:\s*(?:per|each)\s*\w+)?))?\s*$/i;
  const exPlainRe = /^(.{2,60}?)\s+(\d+)\s*[x×]\s*([\d\-–]+(?:\s*(?:steps|min|sec|reps)?)?)\s*$/i;
  // Section headers that mean "training content is over" — never exercises.
  const stopRe = /^(nutrition|meal|macro|supplement|peptide|compound|check[- ]?in|non[- ]?negotiable|daily targets?|cardio protocol|progression|client summary|weekly structure)\b/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (stopRe.test(line)) {
      inTraining = false;
      current = null;
      continue;
    }
    const d = line.match(dayNumRe) || line.match(weekdayRe);
    if (d) {
      inTraining = true;
      current = {
        day: /^\d+$/.test(d[1]) ? `Day ${d[1]}` : d[1][0].toUpperCase() + d[1].slice(1).toLowerCase(),
        name: d[2] ? d[2].trim() : undefined,
        exercises: [],
      };
      days.push(current);
      continue;
    }
    if (current && inTraining) {
      const b = line.match(exBulletRe);
      if (b && b[1] && line.match(/^\s*[-•*]/)) {
        current.exercises.push({
          name: b[1].trim(),
          sets: b[2] ? Number(b[2]) : '',
          reps: b[3] ? b[3].trim() : '',
        });
        continue;
      }
      const p = line.match(exPlainRe);
      if (p) {
        current.exercises.push({ name: p[1].trim(), sets: Number(p[2]), reps: p[3].trim() });
        continue;
      }
      // Short non-sentence lines (e.g. "Cardio 45 min", "Stretching") count;
      // sub-headers ending with ':' and long narrative sentences do NOT.
      if (line.length <= 45 && !line.endsWith(':') && !/[.!?]$/.test(line)) {
        current.exercises.push({ name: line, sets: '', reps: '' });
      }
    }
  }

  const withContent = days.filter((d) => d.exercises.length > 0);
  if (withContent.length > 0) return withContent;
  // No parseable training days — better to show "no program" than garbage.
  return null;
}

function splitName(full: string): { first: string; last: string } {
  const parts = (full || '').trim().split(/\s+/);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

export function mapCheckin(c: WPCheckin, i: number): Checkin {
  return {
    id: `${c.date || 'chk'}-${i}`,
    client_id: '',
    date: c.date || (c.time || '').slice(0, 10),
    weight_lbs: c.weight ?? null,
    water_oz: c.water_oz ?? null,
    cardio_minutes: c.cardio_min ?? null,
    training_done: !!c.trained,
    general_notes: c.notes || null,
    created_at: c.time || '',
  } as unknown as Checkin;
}

export function computeStreak(raw: WPCheckin[]): StreakData {
  const days = new Set(raw.map((c) => c.date).filter(Boolean) as string[]);
  const dayMs = 86400000;
  const key = (t: number) => new Date(t).toISOString().slice(0, 10);

  let current = 0;
  for (let i = 0; i < 366; i++) {
    const d = key(Date.now() - i * dayMs);
    if (days.has(d)) current++;
    else if (i > 0) break;
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    run =
      prev && new Date(d).getTime() - new Date(prev).getTime() === dayMs
        ? run + 1
        : 1;
    best = Math.max(best, run);
    prev = d;
  }

  return {
    current_streak: current,
    best_streak: Math.max(best, current),
    total_checkins: raw.length,
    last_checkin_date: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

export async function fetchClientMe(): Promise<ClientMeResponse> {
  const me = await apiFetch<WPMe>('/client/me');

  let rawCheckins: WPCheckin[] = [];
  try {
    const r = await apiFetch<{ checkins: WPCheckin[] }>('/checkins');
    rawCheckins = r.checkins ?? [];
  } catch {
    // no check-ins yet (or endpoint unavailable) — non-fatal
  }

  // Structured 7-day meal plan + OTC supplements, generated server-side from
  // the coach-approved program. cached=1 never blocks: if the plan isn't
  // generated yet the server kicks off generation in the background and this
  // returns pending — the next refresh picks it up.
  let mealPlanDays: unknown[] | null = null;
  let supplements: unknown[] = [];
  try {
    const mp = await apiFetch<{ days?: unknown[]; supplements?: unknown[] }>(
      '/mealplan?cached=1'
    );
    if (Array.isArray(mp.days) && mp.days.length > 0) mealPlanDays = mp.days;
    if (Array.isArray(mp.supplements)) supplements = mp.supplements;
  } catch {
    // endpoint missing or plan not generated yet — non-fatal
  }

  // Structured workout days, converted server-side by AI from the coach's
  // program text — so exercise names are EXACT and days are properly split.
  // While generation is pending (or on error) we fall back to best-effort
  // text parsing; once the server answers non-pending, its data is truth.
  let workoutDays: WorkoutDay[] | null = null;
  try {
    const wo = await apiFetch<{ days?: unknown[]; pending?: boolean }>(
      '/workout?cached=1'
    );
    if (wo.pending !== true && Array.isArray(wo.days)) {
      workoutDays = wo.days as WorkoutDay[];
    }
  } catch {
    // endpoint missing or plan not generated yet — non-fatal
  }

  const { first, last } = splitName(me.name);
  const programText = me.program_raw_text || me.workout_program || '';

  const client = {
    id: String(me.id),
    organization_id: '',
    user_id: String(me.id),
    first_name: first,
    last_name: last,
    email: me.email,
    phone: null,
    timezone: 'America/New_York',
    target_calories: null,
    target_protein: null,
    target_steps: null,
    target_carbs: null,
    target_fats: null,
    is_active: true,
    leaderboard_opt_in: false,
    weigh_in_day: 'monday',
    current_supplements: supplements,
    current_peds: [],
    current_peptides: [],
    meal_plan: mealPlanDays,
    workout_program: workoutDays ?? parseProgramText(programText),
    cardio_protocol: null,
    medical_protocol: null,
    last_weight: rawCheckins.length
      ? rawCheckins[rawCheckins.length - 1].weight ?? null
      : null,
    created_at: '',
    // Extra fields carried through for screens that want the raw text.
    program_name: me.program_name,
    program_raw_text: programText,
    member_status: me.status,
  } as unknown as Client;

  return {
    client,
    userRole: null,
    organizationId: null,
    metrics: null,
    recentCheckins: rawCheckins.slice(-30).reverse().map(mapCheckin),
    streak: computeStreak(rawCheckins),
    earnedBadges: [],
    allBadges: [],
  };
}
