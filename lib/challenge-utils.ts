import { ChallengeType, ChallengeEntry } from '../types';

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

/**
 * Returns the number of days remaining until end_date, or 0 if past.
 */
export function daysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Returns the number of days until start_date, or 0 if already started.
 */
export function daysUntilStart(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diff = start.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
