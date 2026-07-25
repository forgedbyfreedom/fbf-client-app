import type { WorkoutDay, WorkoutExercise, CardioProtocol } from '../types';
import type { MealPlanDay, MealEntry, IngredientItem } from './nutrition-api';

type Json = unknown;
type JsonObject = { [k: string]: Json };

const isObject = (v: Json): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: Json): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const asNumberOrNull = (v: Json): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const mealTypeFromLabel = (label: string): MealEntry['type'] => {
  const s = label.toLowerCase();
  if (s.includes('breakfast')) return 'breakfast';
  if (s.includes('lunch')) return 'lunch';
  if (s.includes('dinner')) return 'dinner';
  return 'snack';
};

const buildExerciseNotes = (raw: JsonObject): string | undefined => {
  const parts: string[] = [];
  const tempo = asString(raw.tempo);
  const rir = raw.rir;
  const notes = asString(raw.notes);
  if (tempo) parts.push(`Tempo ${tempo}`);
  if (typeof rir === 'number') parts.push(`RIR ${rir}`);
  if (notes) parts.push(notes);
  return parts.length ? parts.join(' • ') : undefined;
};

const normalizeExercise = (raw: Json): WorkoutExercise | null => {
  if (!isObject(raw)) return null;
  const name = asString(raw.name) || asString(raw.exercise);
  if (!name) return null;
  const sets = (typeof raw.sets === 'number' || typeof raw.sets === 'string') ? raw.sets : '';
  const reps = asString(raw.reps);
  const rest = asString(raw.rest) || undefined;
  const notes = buildExerciseNotes(raw);
  return { name, sets, reps, ...(rest ? { rest } : {}), ...(notes ? { notes } : {}) };
};

export function normalizeWorkoutProgram(input: Json): WorkoutDay[] {
  if (Array.isArray(input)) {
    return input
      .map((d) => {
        if (!isObject(d)) return null;
        const day = asString(d.day) || asString(d.name);
        const name = asString(d.day) ? asString(d.name) : '';
        const exercises = Array.isArray(d.exercises)
          ? d.exercises.map(normalizeExercise).filter((x): x is WorkoutExercise => x !== null)
          : [];
        if (!day && exercises.length === 0) return null;
        return { day: day || 'Workout', ...(name ? { name } : {}), exercises };
      })
      .filter((d): d is WorkoutDay => d !== null);
  }

  if (isObject(input) && isObject(input.days)) {
    return Object.entries(input.days)
      .map(([day, exList]) => {
        const exercises = Array.isArray(exList)
          ? exList.map(normalizeExercise).filter((x): x is WorkoutExercise => x !== null)
          : [];
        return { day, exercises };
      })
      .filter((d) => d.exercises.length > 0);
  }

  if (isObject(input) && Array.isArray(input.days)) {
    return normalizeWorkoutProgram(input.days);
  }

  return [];
}

const normalizeIngredient = (food: Json): IngredientItem => {
  // Coach-generated meals carry structured ingredient objects
  // ({name, quantity, unit, category}); older/simple plans use plain strings.
  if (isObject(food)) {
    return {
      name: asString(food.name),
      quantity: asString(food.quantity),
      unit: asString(food.unit),
      category: (asString(food.category) || 'other') as IngredientItem['category'],
      checked: false,
    };
  }
  return {
    name: asString(food),
    quantity: '',
    unit: '',
    category: 'other',
    checked: false,
  };
};

const normalizeMealEntry = (raw: Json, idx: number): MealEntry | null => {
  if (!isObject(raw)) return null;
  const label = asString(raw.meal) || asString(raw.type) || '';
  const name = asString(raw.name) || label || `Meal ${idx + 1}`;
  // The coach meal-plan JSON uses "ingredients"; "foods" kept as a legacy fallback.
  const foods = Array.isArray(raw.ingredients)
    ? raw.ingredients
    : (Array.isArray(raw.foods) ? raw.foods : []);
  return {
    id: `daily-${idx}`,
    type: mealTypeFromLabel(label || name),
    name,
    ingredients: foods.map(normalizeIngredient),
    calories: asNumberOrNull(raw.calories),
    protein_g: asNumberOrNull(raw.protein_g),
    carbs_g: asNumberOrNull(raw.carbs_g),
    fat_g: asNumberOrNull(raw.fat_g),
    recipe_url: null,
    image_url: null,
  };
};

const sampleObjectToMeals = (sample: Json): MealEntry[] => {
  if (!isObject(sample)) return [];
  return Object.entries(sample)
    .map(([key, val], i): MealEntry | null => {
      if (!isObject(val)) return null;
      const desc = asString(val.description);
      if (!desc) return null;
      return {
        id: `daily-${i}`,
        type: mealTypeFromLabel(key),
        name: asString(val.time) ? `${key} (${asString(val.time)})` : key,
        ingredients: [{ name: desc, quantity: '', unit: '', category: 'other', checked: false }],
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        recipe_url: null,
        image_url: null,
      };
    })
    .filter((m): m is MealEntry => m !== null);
};

export function normalizeMealPlan(input: Json): MealPlanDay[] {
  if (Array.isArray(input)) {
    return input
      .map((d) => {
        if (!isObject(d)) return null;
        const day = asString(d.day) || 'Daily';
        const meals = Array.isArray(d.meals)
          ? d.meals.map((m, i) => normalizeMealEntry(m, i)).filter((m): m is MealEntry => m !== null)
          : [];
        if (meals.length === 0) return null;
        return { day, meals };
      })
      .filter((d): d is MealPlanDay => d !== null);
  }

  if (isObject(input)) {
    if (Array.isArray(input.meal_plan)) {
      const meals = input.meal_plan
        .map((m, i) => normalizeMealEntry(m, i))
        .filter((m): m is MealEntry => m !== null);
      if (meals.length > 0) return [{ day: 'Daily', meals }];
    }

    const trainingMeals = sampleObjectToMeals(input.training_day_sample);
    if (trainingMeals.length > 0) return [{ day: 'Daily', meals: trainingMeals }];

    const restMeals = sampleObjectToMeals(input.rest_day_sample);
    if (restMeals.length > 0) return [{ day: 'Daily', meals: restMeals }];
  }

  return [];
}

export function normalizeCardioProtocol(input: Json): CardioProtocol[] {
  if (Array.isArray(input)) {
    return input
      .map((c): CardioProtocol | null => {
        if (!isObject(c)) return null;
        const phase = asString(c.phase);
        const duration = asString(c.duration);
        if (!phase && !duration) return null;
        return { phase: phase || 'Cardio', duration };
      })
      .filter((c): c is CardioProtocol => c !== null);
  }

  if (isObject(input)) {
    const out: CardioProtocol[] = [];
    const daily = asString(input.daily);
    if (daily) out.push({ phase: 'Daily', duration: daily });
    const ar = asString(input.active_rest_day);
    if (ar) out.push({ phase: 'Active Rest', duration: ar });
    return out;
  }

  return [];
}
