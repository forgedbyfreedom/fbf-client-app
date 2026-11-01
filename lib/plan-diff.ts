// Human-readable descriptions of what a client changed, for coach alerts.
import type { MealEntry, IngredientItem } from './nutrition-api';

const ing = (i: IngredientItem) => [i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim();

export function describeMealChange(before: MealEntry, after: MealEntry): { summary: string; details: string[] } {
  const details: string[] = [];
  if (before.name !== after.name) details.push(`Renamed "${before.name}" → "${after.name}"`);

  const b = new Map(before.ingredients.map((i) => [i.name.toLowerCase(), i]));
  const a = new Map(after.ingredients.map((i) => [i.name.toLowerCase(), i]));
  for (const [k, i] of a) {
    const old = b.get(k);
    if (!old) details.push(`Added ${ing(i)}`);
    else if (old.quantity !== i.quantity || old.unit !== i.unit) details.push(`${i.name}: ${ing(old)} → ${ing(i)}`);
  }
  for (const [k, i] of b) if (!a.has(k)) details.push(`Removed ${ing(i)}`);

  for (const [key, label, unit] of [
    ['calories', 'Calories', ''],
    ['protein_g', 'Protein', 'g'],
    ['carbs_g', 'Carbs', 'g'],
    ['fat_g', 'Fat', 'g'],
  ] as const) {
    const x = before[key];
    const y = after[key];
    if (x !== y && (x != null || y != null)) details.push(`${label} ${x ?? '—'}${unit} → ${y ?? '—'}${unit}`);
  }
  const summary = details.length ? `Edited ${after.name}: ${details[0]}${details.length > 1 ? ` (+${details.length - 1} more)` : ''}` : `Edited ${after.name}`;
  return { summary, details };
}
