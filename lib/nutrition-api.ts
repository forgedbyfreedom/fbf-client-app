// Free nutrition APIs — no API keys required for Open Food Facts
// USDA FoodData Central requires a free key from https://fdc.nal.usda.gov/api-key-signup

const OPEN_FOOD_FACTS_BASE = 'https://world.openfoodfacts.org';
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

export interface NutritionInfo {
  name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  serving_size: string | null;
  image_url: string | null;
  source: 'openfoodfacts' | 'usda';
}

export interface MealPlanDay {
  day: string; // 'Monday', 'Tuesday', etc.
  meals: MealEntry[];
}

export interface MealEntry {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  ingredients: IngredientItem[];
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  recipe_url: string | null;
  image_url: string | null;
}

export interface IngredientItem {
  name: string;
  quantity: string;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
}

export type GroceryCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'grains'
  | 'frozen'
  | 'pantry'
  | 'spices'
  | 'beverages'
  | 'supplements'
  | 'other';

export interface ShoppingListItem {
  name: string;
  quantity: string;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
  fromMeals: string[]; // which meals need this ingredient
}

// Search Open Food Facts (completely free, no key needed)
export async function searchFoods(query: string): Promise<NutritionInfo[]> {
  try {
    const res = await fetch(
      `${OPEN_FOOD_FACTS_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.products || []).map((p: Record<string, unknown>): NutritionInfo => {
      const nutrients = (p.nutriments || {}) as Record<string, number>;
      return {
        name: (p.product_name as string) || 'Unknown',
        calories: nutrients['energy-kcal_100g'] ?? null,
        protein_g: nutrients['proteins_100g'] ?? null,
        carbs_g: nutrients['carbohydrates_100g'] ?? null,
        fat_g: nutrients['fat_100g'] ?? null,
        fiber_g: nutrients['fiber_100g'] ?? null,
        serving_size: (p.serving_size as string) || '100g',
        image_url: (p.image_front_small_url as string) || null,
        source: 'openfoodfacts',
      };
    });
  } catch {
    return [];
  }
}

// Barcode lookup via Open Food Facts (free)
export async function lookupBarcode(barcode: string): Promise<NutritionInfo | null> {
  try {
    const res = await fetch(`${OPEN_FOOD_FACTS_BASE}/api/v2/product/${barcode}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null;

    const p = data.product;
    const nutrients = (p.nutriments || {}) as Record<string, number>;
    return {
      name: p.product_name || 'Unknown',
      calories: nutrients['energy-kcal_100g'] ?? null,
      protein_g: nutrients['proteins_100g'] ?? null,
      carbs_g: nutrients['carbohydrates_100g'] ?? null,
      fat_g: nutrients['fat_100g'] ?? null,
      fiber_g: nutrients['fiber_100g'] ?? null,
      serving_size: p.serving_size || '100g',
      image_url: p.image_front_small_url || null,
      source: 'openfoodfacts',
    };
  } catch {
    return null;
  }
}

// Aggregate ingredients from a meal plan into a deduplicated shopping list
export function generateShoppingList(mealPlan: MealPlanDay[]): ShoppingListItem[] {
  const itemMap = new Map<string, ShoppingListItem>();

  for (const day of mealPlan) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        const key = ingredient.name.toLowerCase().trim();
        const existing = itemMap.get(key);
        if (existing) {
          // Combine quantities if same unit, otherwise keep as-is
          if (existing.unit === ingredient.unit) {
            const existingQty = parseFloat(existing.quantity) || 0;
            const newQty = parseFloat(ingredient.quantity) || 0;
            existing.quantity = String(existingQty + newQty);
          }
          existing.fromMeals.push(meal.name);
        } else {
          itemMap.set(key, {
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
            checked: false,
            fromMeals: [meal.name],
          });
        }
      }
    }
  }

  // Sort by category then name
  const categoryOrder: GroceryCategory[] = [
    'produce', 'protein', 'dairy', 'grains', 'frozen', 'pantry', 'spices', 'beverages', 'supplements', 'other',
  ];
  return Array.from(itemMap.values()).sort((a, b) => {
    const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });
}

// Build a deep link URL to Instacart with search items
export function buildInstacartLink(items: ShoppingListItem[]): string {
  const unchecked = items.filter((i) => !i.checked);
  if (unchecked.length === 0) return 'https://www.instacart.com';
  // Instacart search — combine top items for broader results
  const query = unchecked.slice(0, 5).map((i) => i.name).join(' ');
  return `https://www.instacart.com/store/search?q=${encodeURIComponent(query)}`;
}

// Build a deep link URL to Walmart Grocery
export function buildWalmartLink(items: ShoppingListItem[]): string {
  const unchecked = items.filter((i) => !i.checked);
  if (unchecked.length === 0) return 'https://www.walmart.com/grocery';
  const query = unchecked.slice(0, 5).map((i) => i.name).join(' ');
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}&cat_id=976759`;
}

// Build a deep link URL to Amazon Fresh
export function buildAmazonFreshLink(items: ShoppingListItem[]): string {
  const unchecked = items.filter((i) => !i.checked);
  if (unchecked.length === 0) return 'https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo';
  const query = unchecked.slice(0, 5).map((i) => i.name).join(' ');
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=amazonfresh`;
}

// Category display labels and colors
export const CATEGORY_CONFIG: Record<GroceryCategory, { label: string; color: string }> = {
  produce: { label: 'Produce', color: '#22c55e' },
  protein: { label: 'Protein', color: '#ef4444' },
  dairy: { label: 'Dairy', color: '#3b82f6' },
  grains: { label: 'Grains & Bread', color: '#eab308' },
  frozen: { label: 'Frozen', color: '#06b6d4' },
  pantry: { label: 'Pantry', color: '#f97316' },
  spices: { label: 'Spices & Seasonings', color: '#a855f7' },
  beverages: { label: 'Beverages', color: '#ec4899' },
  supplements: { label: 'Supplements', color: '#FF6A00' },
  other: { label: 'Other', color: '#888888' },
};
