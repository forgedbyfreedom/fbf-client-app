#!/usr/bin/env node
/**
 * Populate John Steadman's client profile with full program data
 * from assets/programs/john-steadman-program.html
 *
 * Usage:
 *   node scripts/populate-john-steadman.mjs <your-supabase-password>
 *
 * This script will:
 * 1. Authenticate as Bryan (admin) via Supabase
 * 2. Find John Steadman in the client list
 * 3. PATCH his profile with all program data
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://sdrsoccfingecvlzrlym.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hZCl16bChwDHZ4d9OFZf1A_lshrzLx1';
const API_URL = 'https://fbf-dashboard.vercel.app';
const ADMIN_EMAIL = 'forgedbyfreedom@proton.me';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/populate-john-steadman.mjs <password>');
  process.exit(1);
}

// ── Step 1: Authenticate ──
console.log('🔐 Authenticating...');
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: ADMIN_EMAIL, password }),
});

const authData = await authRes.json();
if (!authData.access_token) {
  console.error('Auth failed:', authData.msg || authData);
  process.exit(1);
}
console.log('  Authenticated as', authData.user?.email);
const TOKEN = authData.access_token;

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Step 2: Find John Steadman ──
console.log('🔍 Finding John Steadman...');
const clientsRes = await fetch(`${API_URL}/api/admin/clients`, { headers });
const clientsData = await clientsRes.json();
const clients = Array.isArray(clientsData) ? clientsData : (clientsData.clients || clientsData.data || []);

const john = clients.find(c =>
  c.first_name?.toLowerCase() === 'john' && c.last_name?.toLowerCase() === 'steadman'
);

if (!john) {
  console.error('John Steadman not found in client list.');
  console.log('Available clients:');
  clients.forEach(c => console.log(`  - ${c.first_name} ${c.last_name} (${c.id})`));
  process.exit(1);
}

console.log(`  Found: ${john.first_name} ${john.last_name} (ID: ${john.id})`);

// ── Step 3: Build payload ──
console.log('📦 Building program payload...');

// Read the HTML program
const programHtml = readFileSync(
  resolve(__dirname, '../assets/programs/john-steadman-program.html'),
  'utf-8'
);

const payload = {
  // Basic info
  email: 'johnwallacesteadman@gmail.com',
  phone: '(843) 991-3657',

  // Daily Targets
  target_calories: 1880,
  target_protein: 200,
  target_carbs: 100,
  target_fats: 73,
  target_steps: 8000,
  target_water_oz: 100,
  weigh_in_day: 'Monday',

  // Program metadata
  program_name: 'FBF Comprehensive Recomposition Protocol',
  program_raw_text: programHtml,

  // ── Supplements ──
  current_supplements: [
    { name: 'Whey Protein Isolate', dose: '1-2 scoops/day (25-50g protein)', frequency: 'Daily' },
    { name: 'Casein Protein', dose: '1 scoop/day (25g protein)', frequency: 'Before bed' },
    { name: 'Creatine Monohydrate', dose: '5g', frequency: 'Daily' },
    { name: 'Omega-3 Fish Oil', dose: '2-3g EPA/DHA', frequency: 'Daily (split dose with meals)' },
    { name: 'Magnesium Glycinate', dose: '400mg', frequency: 'Before bed' },
    { name: 'Vitamin D3 + K2', dose: '5,000 IU D3 + 100mcg K2', frequency: 'Morning with fat-containing meal' },
    { name: 'Electrolytes (sugar-free)', dose: '1 serving (sodium, potassium, magnesium)', frequency: 'Morning or intra-workout' },
    { name: 'Berberine (Optional - Discuss with Endo)', dose: '500mg 2x/day', frequency: 'Before meals' },
  ],

  // ── Peptides ──
  current_peptides: [
    {
      name: 'CJC-1295 / Ipamorelin',
      dose: '300mcg CJC / 300mcg Ipamorelin',
      frequency: 'Daily',
      timing: 'Before bed (fasted 2+ hours) — SubQ injection',
    },
    {
      name: 'BPC-157',
      dose: '250-500mcg/day',
      frequency: 'Daily',
      timing: 'AM or split AM/PM — SubQ injection',
    },
    {
      name: 'Tesamorelin',
      dose: '2mg/day',
      frequency: 'Daily',
      timing: 'Before bed (fasted) — SubQ injection',
    },
    {
      name: 'Thymosin Alpha-1 (Optional Add-On)',
      dose: '1.6mg',
      frequency: '2x/week',
      timing: 'Any time — SubQ injection. Add after first 4 weeks.',
    },
  ],

  // ── PEDs (GLP-1 is current Rx) ──
  current_peds: [
    {
      compound: 'GLP-1 Agonist (Current Rx)',
      dose: 'Per endocrinologist',
      frequency: 'Per endocrinologist',
      route: 'SubQ',
    },
  ],

  // ── Medical Protocol ──
  medical_protocol: [
    {
      name: 'Type 1 Diabetes Management',
      dose: 'Insulin per endocrinologist',
      frequency: 'Daily',
      notes: 'Low-carb compatible. Monitor blood glucose before/after training. Keep fast-acting glucose on hand.',
    },
    {
      name: 'Retatrutide Discussion',
      dose: 'TBD by endocrinologist',
      frequency: 'TBD',
      notes: 'Triple-agonist (GIP/GLP-1/Glucagon). Discuss at next endo appointment as potential upgrade from current GLP-1.',
    },
  ],

  // ── Workout Program (4-Day Upper/Lower) ──
  workout_program: [
    {
      day: 'Day 1 — Upper Body Push Focus (Monday)',
      exercises: [
        { name: 'Dumbbell Incline Press (30-45° incline, full stretch)', sets: '4', reps: '8-10' },
        { name: 'Machine Chest Press (slow 3s eccentric)', sets: '3', reps: '10-12' },
        { name: 'Dumbbell Shoulder Press, Seated', sets: '3', reps: '10-12' },
        { name: 'Cable Lateral Raise (behind body)', sets: '3', reps: '12-15' },
        { name: 'Tricep Rope Pushdown', sets: '3', reps: '12-15' },
        { name: 'Overhead Dumbbell Tricep Extension', sets: '3', reps: '10-12' },
      ],
    },
    {
      day: 'Day 2 — Lower Body Quad Focus (Tuesday)',
      exercises: [
        { name: 'Leg Press (shoulder width, full depth)', sets: '4', reps: '10-12' },
        { name: 'Hack Squat or Pendulum Squat', sets: '3', reps: '10-12' },
        { name: 'Leg Extension (1s pause at top)', sets: '3', reps: '12-15' },
        { name: 'Walking Dumbbell Lunges', sets: '3', reps: '12/leg' },
        { name: 'Seated Calf Raise (2s pause at stretch)', sets: '4', reps: '12-15' },
      ],
    },
    {
      day: 'Day 3 — Upper Body Pull Focus (Thursday)',
      exercises: [
        { name: 'Lat Pulldown, Wide Grip', sets: '4', reps: '8-10' },
        { name: 'Seated Cable Row (V-handle)', sets: '3', reps: '10-12' },
        { name: 'Dumbbell Row, Single Arm (bench supported)', sets: '3', reps: '10-12' },
        { name: 'Machine Rear Delt Fly', sets: '3', reps: '15-20' },
        { name: 'Dumbbell Bicep Curl (alternating)', sets: '3', reps: '10-12' },
        { name: 'Incline Dumbbell Hammer Curl (45° bench)', sets: '3', reps: '10-12' },
      ],
    },
    {
      day: 'Day 4 — Lower Body Posterior Focus (Friday)',
      exercises: [
        { name: 'Romanian Dumbbell Deadlift', sets: '4', reps: '8-10' },
        { name: 'Lying Leg Curl (slow release)', sets: '3', reps: '10-12' },
        { name: 'Hip Thrust (2s pause at top)', sets: '3', reps: '10-12' },
        { name: 'Bulgarian Split Squat (dumbbells)', sets: '3', reps: '10/leg' },
        { name: 'Standing Calf Raise (full ROM)', sets: '4', reps: '10-12' },
      ],
    },
  ],

  // ── Cardio Protocol ──
  cardio_protocol: [
    { phase: 'Daily Steps', duration: '8,000 steps minimum' },
    { phase: 'Post-Workout (3x/week)', duration: '15-20 min incline treadmill walk (10-12% incline, 3.0-3.5 mph)' },
    { phase: 'Optional Weekends', duration: '30-45 min moderate activity (hike, bike, swim)' },
  ],

  // ── Meal Plan ──
  meal_plan: [
    {
      day: 'Every Day',
      meals: [
        {
          id: 'meal-1-prewo',
          type: 'breakfast',
          name: 'Protein Coffee + Egg Whites',
          calories: 450,
          protein_g: 52,
          carbs_g: 8,
          fat_g: 22,
          recipe_url: null,
          image_url: null,
          ingredients: [
            { name: 'Whey Protein Isolate', quantity: '1', unit: 'scoop', category: 'supplements', checked: false },
            { name: 'Black Coffee', quantity: '8', unit: 'oz', category: 'beverages', checked: false },
            { name: 'Liquid Egg Whites', quantity: '1', unit: 'cup', category: 'protein', checked: false },
            { name: 'Baby Spinach', quantity: '1', unit: 'handful', category: 'produce', checked: false },
            { name: 'Cheddar Cheese', quantity: '1', unit: 'oz', category: 'dairy', checked: false },
          ],
        },
        {
          id: 'meal-2-postwo',
          type: 'breakfast',
          name: 'Turkey & Veggie Scramble with Oats',
          calories: 480,
          protein_g: 48,
          carbs_g: 32,
          fat_g: 16,
          recipe_url: null,
          image_url: null,
          ingredients: [
            { name: '99% Lean Ground Turkey', quantity: '6', unit: 'oz', category: 'protein', checked: false },
            { name: 'Bell Peppers', quantity: '0.5', unit: 'cup diced', category: 'produce', checked: false },
            { name: 'Yellow Onion', quantity: '0.25', unit: 'cup diced', category: 'produce', checked: false },
            { name: 'Mushrooms', quantity: '0.5', unit: 'cup sliced', category: 'produce', checked: false },
            { name: 'Old-Fashioned Oats', quantity: '0.33', unit: 'cup dry', category: 'grains', checked: false },
            { name: 'Cinnamon', quantity: '1', unit: 'tsp', category: 'spices', checked: false },
            { name: 'Almond Butter', quantity: '1', unit: 'tbsp', category: 'pantry', checked: false },
          ],
        },
        {
          id: 'meal-3-lunch',
          type: 'lunch',
          name: 'Grilled Chicken Power Bowl',
          calories: 490,
          protein_g: 52,
          carbs_g: 22,
          fat_g: 20,
          recipe_url: null,
          image_url: null,
          ingredients: [
            { name: 'Chicken Breast (boneless, skinless)', quantity: '7', unit: 'oz', category: 'protein', checked: false },
            { name: 'Mixed Greens', quantity: '2', unit: 'cups', category: 'produce', checked: false },
            { name: 'Avocado', quantity: '0.25', unit: 'whole', category: 'produce', checked: false },
            { name: 'Cucumber', quantity: '0.5', unit: 'cup sliced', category: 'produce', checked: false },
            { name: 'Cherry Tomatoes', quantity: '0.5', unit: 'cup', category: 'produce', checked: false },
            { name: 'Olive Oil Vinaigrette', quantity: '2', unit: 'tbsp', category: 'pantry', checked: false },
            { name: 'Black Beans (canned)', quantity: '0.33', unit: 'cup', category: 'pantry', checked: false },
          ],
        },
        {
          id: 'meal-4-dinner',
          type: 'dinner',
          name: 'Salmon with Roasted Vegetables',
          calories: 460,
          protein_g: 42,
          carbs_g: 28,
          fat_g: 15,
          recipe_url: null,
          image_url: null,
          ingredients: [
            { name: 'Wild-Caught Salmon Fillet', quantity: '6', unit: 'oz', category: 'protein', checked: false },
            { name: 'Lemon', quantity: '0.5', unit: 'whole', category: 'produce', checked: false },
            { name: 'Garlic', quantity: '2', unit: 'cloves', category: 'produce', checked: false },
            { name: 'Broccoli', quantity: '1', unit: 'cup', category: 'produce', checked: false },
            { name: 'Asparagus', quantity: '0.5', unit: 'cup', category: 'produce', checked: false },
            { name: 'Olive Oil', quantity: '1', unit: 'tsp', category: 'pantry', checked: false },
            { name: 'Sweet Potato', quantity: '0.5', unit: 'cup cubed', category: 'produce', checked: false },
          ],
        },
        {
          id: 'meal-5-snack',
          type: 'snack',
          name: 'Casein Pudding',
          calories: 200,
          protein_g: 28,
          carbs_g: 6,
          fat_g: 8,
          recipe_url: null,
          image_url: null,
          ingredients: [
            { name: 'Casein Protein', quantity: '1', unit: 'scoop', category: 'supplements', checked: false },
            { name: 'Natural Peanut Butter', quantity: '1', unit: 'tbsp', category: 'pantry', checked: false },
          ],
        },
      ],
    },
  ],
};

// ── Step 4: PATCH client ──
console.log(`📤 Uploading to client ${john.id}...`);
const patchRes = await fetch(`${API_URL}/api/admin/clients/${john.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify(payload),
});

const patchData = await patchRes.json();
if (!patchRes.ok) {
  console.error('PATCH failed:', patchRes.status, patchData);
  process.exit(1);
}

console.log('');
console.log('=== John Steadman Profile Updated ===');
console.log('  Targets: 1,880 cal | 200g P | 100g C | 73g F | 8,000 steps');
console.log('  Supplements: 8 items');
console.log('  Peptides: 4 items (CJC/Ipa, BPC-157, Tesamorelin, TA-1)');
console.log('  Workout: 4-day Upper/Lower split');
console.log('  Cardio: 3-tier protocol');
console.log('  Meal Plan: 5 meals/day with full ingredients');
console.log('  Medical: T1D management + Retatrutide discussion');
console.log('  Program HTML: Uploaded');
console.log('');
console.log('Done!');
