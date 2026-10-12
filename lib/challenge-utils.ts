import { ChallengeType, ChallengeEntry, ChallengeStatus } from '../types';

/**
 * For "lower is better" types (weight loss, body fat), the % change is negative
 * when the user improves, so we negate to rank higher = better.
 * For "higher is better" types (strength, steps, adherence), positive % = better.
 */
export function calculateChangePct(
  type: ChallengeType,
  baseline: number,
  current: number,
): number {
  if (baseline === 0) return 0;
  const rawPct = ((current - baseline) / baseline) * 100;

  switch (type) {
    case 'weight_loss_pct':
    case 'body_fat_pct':
      // Negative rawPct means loss → we want positive for ranking
      return -rawPct;
    case 'strength_gain_pct':
    case 'steps':
    case 'adherence':
    case 'custom':
    default:
      return rawPct;
  }
}

/**
 * Rank entries by change_pct descending (highest improvement first).
 */
export function rankEntries(entries: ChallengeEntry[]): ChallengeEntry[] {
  const sorted = [...entries].sort((a, b) => b.change_pct - a.change_pct);
  return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Parse a challenge date. Date-only strings ("2026-03-31") are read as LOCAL
 * calendar days — `new Date('2026-03-31')` is UTC midnight, which is the
 * previous evening in US time zones and would end a challenge a day early.
 */
function parseChallengeDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(dateStr);
}

/** Start of the challenge's first day (local). */
function startOf(startDate: string): Date {
  return parseChallengeDate(startDate);
}

/** End of the challenge's last day (local) — a challenge runs through its end_date. */
function endOf(endDate: string): Date {
  const d = parseChallengeDate(endDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * The challenge's real status, derived from its dates. A stored `status` is a
 * snapshot from when the challenge was created and goes stale, so never trust
 * it for display.
 */
export function deriveChallengeStatus(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): ChallengeStatus {
  if (now < startOf(startDate)) return 'upcoming';
  if (now > endOf(endDate)) return 'completed';
  return 'active';
}

/**
 * Returns the number of days remaining until end_date, or 0 if past.
 */
export function daysRemaining(endDate: string): number {
  const diff = endOf(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

/**
 * Returns the number of days until start_date, or 0 if already started.
 */
export function daysUntilStart(startDate: string): number {
  const diff = startOf(startDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

/**
 * Format a date string as "MMM D, YYYY"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Returns a human-readable label for the challenge type.
 */
export function challengeTypeLabel(type: ChallengeType): string {
  switch (type) {
    case 'weight_loss_pct':
      return '% WEIGHT LOSS';
    case 'body_fat_pct':
      return '% BODY FAT';
    case 'strength_gain_pct':
      return '% STRENGTH GAIN';
    case 'steps':
      return 'STEPS';
    case 'adherence':
      return 'ADHERENCE';
    case 'custom':
      return 'CUSTOM';
  }
}

/**
 * Whether higher change_pct is "better" for display purposes.
 * After our normalization, higher is always better in change_pct.
 */
export function isHigherBetter(_type: ChallengeType): boolean {
  return true; // After normalization in calculateChangePct, higher is always better
}
