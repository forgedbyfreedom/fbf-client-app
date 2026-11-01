import { normalizeMealPlan } from './normalize-plan';

export interface MacroTargets {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
}

const EMPTY: MacroTargets = { calories: null, protein: null, carbs: null, fats: null };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Today's targets from the coach-approved meal plan: the sum of today's
 * planned meals. The plan is generated from the program so it already
 * reflects training vs rest days and any "today only" change the coach made.
 */
export function targetsFromMealPlan(mealPlan: unknown, now: Date = new Date()): MacroTargets {
  const days = normalizeMealPlan(mealPlan);
  if (!days.length) return EMPTY;
  const today = DAY_NAMES[now.getDay()].toLowerCase();
  const day = days.find((d) => String(d.day).toLowerCase() === today);
  if (!day || !day.meals.length) return EMPTY;
  const sum = (k: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g') => {
    let total = 0;
    let any = false;
    for (const m of day.meals) {
      const v = m[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        total += v;
        any = true;
      }
    }
    return any && total > 0 ? Math.round(total) : null;
  };
  return { calories: sum('calories'), protein: sum('protein_g'), carbs: sum('carbs_g'), fats: sum('fat_g') };
}

/**
 * Fallback: daily targets written in the program text, e.g.
 * "Calories: 2,400", "Protein – 220 g", "Carbs: 250g", "Fats 70 g".
 * Takes the first number after each label.
 */
export function targetsFromProgramText(text: string | null | undefined): MacroTargets {
  if (!text) return EMPTY;
  const grab = (re: RegExp, min: number, max: number) => {
    const m = text.match(re);
    if (!m) return null;
    const n = Number(m[1].replace(/,/g, ''));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  return {
    calories: grab(/\b(?:calories|kcal)\b[^0-9\n]{0,20}([0-9][0-9,]{2,5})/i, 800, 8000),
    protein: grab(/\bprotein\b[^0-9\n]{0,20}([0-9]{2,3})\s*g/i, 30, 500),
    carbs: grab(/\bcarb(?:s|ohydrates?)?\b[^0-9\n]{0,20}([0-9]{1,3})\s*g/i, 0, 900),
    fats: grab(/\bfats?\b[^0-9\n]{0,20}([0-9]{1,3})\s*g/i, 10, 400),
  };
}

/** Coach-set numbers win, then today's meal plan, then the program text. */
export function resolveTargets(
  explicit: Partial<MacroTargets>,
  mealPlan: unknown,
  programText?: string | null,
  now?: Date
): MacroTargets {
  const plan = targetsFromMealPlan(mealPlan, now);
  const text = targetsFromProgramText(programText);
  const pick = (k: keyof MacroTargets) => explicit[k] ?? plan[k] ?? text[k] ?? null;
  return { calories: pick('calories'), protein: pick('protein'), carbs: pick('carbs'), fats: pick('fats') };
}
