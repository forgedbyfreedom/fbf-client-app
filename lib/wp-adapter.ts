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
  const dayRe = /^\s*(?:[-•*]\s*)?day\s*(\d+)\s*[:\-–—]?\s*(.*)$/i;
  const exRe = /^\s*[-•*]\s*(.+?)\s*(?:[—:–-]\s*(\d+)\s*[x×]\s*([\d\s\-–to]+(?:\s*(?:per|each)\s*\w+)?))?\s*$/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const d = line.match(dayRe);
    if (d) {
      current = {
        day: `Day ${d[1]}`,
        name: d[2] ? d[2].trim() : undefined,
        exercises: [],
      };
      days.push(current);
      continue;
    }
    if (current) {
      const m = line.match(exRe);
      if (m && m[1]) {
        const ex: WorkoutExercise = {
          name: m[1].trim(),
          sets: m[2] ? Number(m[2]) : '',
          reps: m[3] ? m[3].trim() : '',
        };
        current.exercises.push(ex);
      } else if (!/^[A-Z\s&/]+$/.test(line)) {
        // freeform note line inside a day
        current.exercises.push({ name: line, sets: '', reps: '' });
      }
    }
  }

  const withContent = days.filter((d) => d.exercises.length > 0);
  if (withContent.length > 0) return withContent;

  // Fallback: one "day" holding the raw program lines so nothing is hidden.
  return [
    {
      day: 'Your Program',
      exercises: lines
        .filter((l) => l.trim())
        .map((l) => ({ name: l.trim(), sets: '', reps: '' })),
    },
  ];
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
    current_supplements: [],
    current_peds: [],
    current_peptides: [],
    meal_plan: null,
    workout_program: parseProgramText(programText),
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
