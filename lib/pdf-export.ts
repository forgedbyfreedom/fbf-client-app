import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import {
  MealPlanDay,
  ShoppingListItem,
  GroceryCategory,
  CATEGORY_CONFIG,
} from './nutrition-api';
// Types are imported as needed; Checkin data is passed via PhotoComparisonData interface

// ─── Shared HTML scaffolding ─────────────────────────────────────────

const FBF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0a0a0a;
    color: #ffffff;
    padding: 32px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    text-align: center;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 2px solid #FF6A00;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #FF6A00;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }
  .header .subtitle {
    font-size: 13px;
    color: #888888;
    font-weight: 500;
  }
  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #FF6A00;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 20px 0 12px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #2a2a2a;
  }
  .card {
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
  }
  th {
    background: #1a1a1a;
    color: #FF6A00;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid #2a2a2a;
  }
  td {
    padding: 7px 10px;
    font-size: 13px;
    color: #ffffff;
    border-bottom: 1px solid #1a1a1a;
  }
  tr:last-child td { border-bottom: none; }
  .macro-grid {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }
  .macro-box {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
  }
  .macro-box .value {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
  }
  .macro-box .label {
    font-size: 10px;
    color: #888888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
  .category-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 4px;
    margin-right: 6px;
    vertical-align: middle;
  }
  .category-header {
    font-size: 12px;
    font-weight: 600;
    color: #888888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 14px 0 6px 0;
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0 5px 16px;
    font-size: 13px;
    border-bottom: 1px solid #1a1a1a;
  }
  .item-name { color: #ffffff; }
  .item-qty { color: #888888; font-weight: 500; }
  .footer {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid #2a2a2a;
    text-align: center;
    font-size: 10px;
    color: #555555;
  }
  .meal-type {
    font-size: 11px;
    font-weight: 600;
    color: #FF6A00;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .meal-name {
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 6px;
  }
  .ingredient-list {
    font-size: 12px;
    color: #888888;
    margin-bottom: 6px;
    line-height: 1.5;
  }
  .photo-grid {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }
  .photo-col {
    flex: 1;
    text-align: center;
  }
  .photo-col img {
    width: 100%;
    border-radius: 8px;
    border: 1px solid #2a2a2a;
  }
  .photo-date {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 8px;
  }
  .stat-row {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 8px;
  }
  .stat-item {
    text-align: center;
  }
  .stat-value {
    font-size: 16px;
    font-weight: 700;
    color: #FF6A00;
  }
  .stat-label {
    font-size: 10px;
    color: #888888;
    text-transform: uppercase;
  }
  @media print {
    body { padding: 20px; }
    .card { break-inside: avoid; }
  }
`;

function wrapHTML(title: string, body: string): string {
  const now = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${FBF_STYLES}</style>
</head>
<body>
  <div class="header">
    <h1>FORGED BY FREEDOM</h1>
    <div class="subtitle">${title} &mdash; ${now}</div>
  </div>
  ${body}
  <div class="footer">
    &copy; ${new Date().getFullYear()} Forged by Freedom LLC &mdash; All rights reserved.<br/>
    Generated ${now}
  </div>
</body>
</html>`;
}

// ─── Share helper ────────────────────────────────────────────────────

async function shareOrSavePDF(html: string, filenamePrefix: string): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${filenamePrefix}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF Saved', `Your PDF has been saved to:\n${uri}`);
    }
  } catch (error: any) {
    // User cancelled the share sheet — not a real error
    if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
      return;
    }
    Alert.alert('Export Error', 'Failed to generate PDF. Please try again.');
    console.error('[pdf-export]', error);
  }
}

// ─── 1. Grocery List PDF ─────────────────────────────────────────────

export async function generateGroceryListPDF(items: ShoppingListItem[]): Promise<void> {
  // Group by category
  const grouped: Record<string, ShoppingListItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const categoryOrder: GroceryCategory[] = [
    'produce', 'protein', 'dairy', 'grains', 'frozen',
    'pantry', 'spices', 'beverages', 'supplements', 'other',
  ];

  let body = '<div class="section-title">Weekly Grocery List</div>';

  for (const cat of categoryOrder) {
    const catItems = grouped[cat];
    if (!catItems || catItems.length === 0) continue;
    const config = CATEGORY_CONFIG[cat];

    body += `
      <div class="category-header">
        <span class="category-dot" style="background:${config.color}"></span>
        ${config.label} (${catItems.length})
      </div>`;

    for (const item of catItems) {
      body += `
        <div class="item-row">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity} ${item.unit}</span>
        </div>`;
    }
  }

  // Summary
  body += `
    <div class="card" style="margin-top:16px;">
      <div style="font-size:12px;color:#888;">
        Total items: ${items.length} &bull;
        Used in: ${new Set(items.flatMap((i) => i.fromMeals)).size} meals
      </div>
    </div>`;

  const html = wrapHTML('Weekly Grocery List', body);
  await shareOrSavePDF(html, 'FBF-Grocery-List');
}

// ─── 2. Meal Plan PDF ────────────────────────────────────────────────

export async function generateMealPlanPDF(
  mealPlan: MealPlanDay[],
  targets?: { calories?: number | null; protein?: number | null; carbs?: number | null; fats?: number | null },
): Promise<void> {
  let body = '';

  // Targets bar if available
  if (targets && (targets.calories || targets.protein)) {
    body += `
      <div class="section-title">Daily Targets</div>
      <div class="macro-grid">
        ${targets.calories ? `<div class="macro-box"><div class="value">${targets.calories}</div><div class="label">Calories</div></div>` : ''}
        ${targets.protein ? `<div class="macro-box"><div class="value">${targets.protein}g</div><div class="label">Protein</div></div>` : ''}
        ${targets.carbs ? `<div class="macro-box"><div class="value">${targets.carbs}g</div><div class="label">Carbs</div></div>` : ''}
        ${targets.fats ? `<div class="macro-box"><div class="value">${targets.fats}g</div><div class="label">Fat</div></div>` : ''}
      </div>`;
  }

  for (const day of mealPlan) {
    body += `<div class="section-title">${day.day}</div>`;

    let dayCalories = 0;
    let dayProtein = 0;
    let dayCarbs = 0;
    let dayFat = 0;

    for (const meal of day.meals) {
      dayCalories += meal.calories || 0;
      dayProtein += meal.protein_g || 0;
      dayCarbs += meal.carbs_g || 0;
      dayFat += meal.fat_g || 0;

      const ingredients = meal.ingredients
        .map((i) => `${i.quantity} ${i.unit} ${i.name}`)
        .join(', ');

      body += `
        <div class="card">
          <div class="meal-type">${meal.type}</div>
          <div class="meal-name">${meal.name}</div>
          <div class="ingredient-list">${ingredients}</div>
          <div class="macro-grid">
            <div class="macro-box"><div class="value">${meal.calories ?? '--'}</div><div class="label">Cal</div></div>
            <div class="macro-box"><div class="value">${meal.protein_g ?? '--'}g</div><div class="label">Protein</div></div>
            <div class="macro-box"><div class="value">${meal.carbs_g ?? '--'}g</div><div class="label">Carbs</div></div>
            <div class="macro-box"><div class="value">${meal.fat_g ?? '--'}g</div><div class="label">Fat</div></div>
          </div>
        </div>`;
    }

    // Day totals
    body += `
      <div class="card" style="border-color:#FF6A00;">
        <div style="font-size:12px;font-weight:600;color:#FF6A00;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
          ${day.day} Totals
        </div>
        <div class="macro-grid">
          <div class="macro-box"><div class="value">${dayCalories}</div><div class="label">Calories</div></div>
          <div class="macro-box"><div class="value">${dayProtein}g</div><div class="label">Protein</div></div>
          <div class="macro-box"><div class="value">${dayCarbs}g</div><div class="label">Carbs</div></div>
          <div class="macro-box"><div class="value">${dayFat}g</div><div class="label">Fat</div></div>
        </div>
      </div>`;
  }

  const html = wrapHTML('Weekly Meal Plan', body);
  await shareOrSavePDF(html, 'FBF-Meal-Plan');
}

// ─── 3. Progress Photos Side-by-Side PDF ─────────────────────────────

export interface PhotoComparisonData {
  leftDate: string;
  leftPhotos: string[]; // URLs (front, side, back)
  leftWeight?: number | null;
  leftBodyFat?: number | null;
  rightDate: string;
  rightPhotos: string[];
  rightWeight?: number | null;
  rightBodyFat?: number | null;
  clientName?: string;
}

export async function generateProgressPhotoPDF(data: PhotoComparisonData): Promise<void> {
  let body = '';

  if (data.clientName) {
    body += `<div style="text-align:center;font-size:16px;font-weight:600;color:#ffffff;margin-bottom:16px;">${data.clientName}</div>`;
  }

  body += '<div class="section-title">Progress Comparison</div>';

  // Side-by-side photos
  const maxPhotos = Math.max(data.leftPhotos.length, data.rightPhotos.length);
  const photoLabels = ['Front', 'Side', 'Back'];

  for (let i = 0; i < maxPhotos; i++) {
    const label = photoLabels[i] || `Photo ${i + 1}`;
    body += `
      <div style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;margin:12px 0 6px 0;">${label}</div>
      <div class="photo-grid">
        <div class="photo-col">
          <div class="photo-date">${data.leftDate}</div>
          ${data.leftPhotos[i]
            ? `<img src="${data.leftPhotos[i]}" alt="${label} - ${data.leftDate}" />`
            : '<div style="background:#1a1a1a;border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#555;font-size:12px;">No photo</div>'}
        </div>
        <div class="photo-col">
          <div class="photo-date">${data.rightDate}</div>
          ${data.rightPhotos[i]
            ? `<img src="${data.rightPhotos[i]}" alt="${label} - ${data.rightDate}" />`
            : '<div style="background:#1a1a1a;border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#555;font-size:12px;">No photo</div>'}
        </div>
      </div>`;
  }

  // Stats overlay
  const hasStats =
    data.leftWeight || data.rightWeight || data.leftBodyFat || data.rightBodyFat;

  if (hasStats) {
    body += `
      <div class="section-title">Stats</div>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>${data.leftDate}</th>
            <th>${data.rightDate}</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>`;

    if (data.leftWeight || data.rightWeight) {
      const change =
        data.leftWeight && data.rightWeight
          ? (data.rightWeight - data.leftWeight).toFixed(1)
          : '--';
      const changeColor =
        data.leftWeight && data.rightWeight && data.rightWeight < data.leftWeight
          ? '#22c55e'
          : data.leftWeight && data.rightWeight && data.rightWeight > data.leftWeight
          ? '#ef4444'
          : '#888888';
      body += `
          <tr>
            <td>Weight (lbs)</td>
            <td>${data.leftWeight ?? '--'}</td>
            <td>${data.rightWeight ?? '--'}</td>
            <td style="color:${changeColor};font-weight:600;">${change !== '--' ? (parseFloat(change) > 0 ? '+' : '') + change : '--'}</td>
          </tr>`;
    }

    if (data.leftBodyFat || data.rightBodyFat) {
      const change =
        data.leftBodyFat && data.rightBodyFat
          ? (data.rightBodyFat - data.leftBodyFat).toFixed(1)
          : '--';
      const changeColor =
        data.leftBodyFat && data.rightBodyFat && data.rightBodyFat < data.leftBodyFat
          ? '#22c55e'
          : data.leftBodyFat && data.rightBodyFat && data.rightBodyFat > data.leftBodyFat
          ? '#ef4444'
          : '#888888';
      body += `
          <tr>
            <td>Body Fat %</td>
            <td>${data.leftBodyFat ?? '--'}%</td>
            <td>${data.rightBodyFat ?? '--'}%</td>
            <td style="color:${changeColor};font-weight:600;">${change !== '--' ? (parseFloat(change) > 0 ? '+' : '') + change + '%' : '--'}</td>
          </tr>`;
    }

    body += `
        </tbody>
      </table>`;
  }

  const html = wrapHTML('Progress Photos', body);
  await shareOrSavePDF(html, 'FBF-Progress-Photos');
}
