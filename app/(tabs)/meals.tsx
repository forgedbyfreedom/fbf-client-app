import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useFoodLog } from '../../hooks/useFoodLog';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { Card } from '../../components/ui/Card';
import { MealCard } from '../../components/meals/MealCard';
import { ShoppingList } from '../../components/meals/ShoppingList';
import { DeliveryButtons } from '../../components/meals/DeliveryButtons';
import { DaySelector } from '../../components/meals/DaySelector';
import { BarcodeScannerButton } from '../../components/checkin/BarcodeScanner';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import {
  MealPlanDay,
  ShoppingListItem,
  NutritionInfo,
  generateShoppingList,
} from '../../lib/nutrition-api';
import { generateMealPlanPDF, generateGroceryListPDF } from '../../lib/pdf-export';

// Fallback meal plan for demo/new users without a coach-assigned plan
const SAMPLE_MEAL_PLAN: MealPlanDay[] = [
  {
    day: 'Monday',
    meals: [
      {
        id: '1',
        type: 'breakfast',
        name: 'Protein Oatmeal Bowl',
        ingredients: [
          { name: 'Rolled Oats', quantity: '1', unit: 'cup', category: 'grains', checked: false },
          { name: 'Whey Protein Powder', quantity: '1', unit: 'scoop', category: 'supplements', checked: false },
          { name: 'Banana', quantity: '1', unit: 'medium', category: 'produce', checked: false },
          { name: 'Almond Butter', quantity: '1', unit: 'tbsp', category: 'pantry', checked: false },
          { name: 'Blueberries', quantity: '0.5', unit: 'cup', category: 'produce', checked: false },
        ],
        calories: 520,
        protein_g: 38,
        carbs_g: 62,
        fat_g: 14,
        recipe_url: null,
        image_url: null,
      },
      {
        id: '2',
        type: 'lunch',
        name: 'Grilled Chicken & Rice',
        ingredients: [
          { name: 'Chicken Breast', quantity: '8', unit: 'oz', category: 'protein', checked: false },
          { name: 'Jasmine Rice', quantity: '1', unit: 'cup', category: 'grains', checked: false },
          { name: 'Broccoli', quantity: '2', unit: 'cups', category: 'produce', checked: false },
          { name: 'Olive Oil', quantity: '1', unit: 'tbsp', category: 'pantry', checked: false },
          { name: 'Lemon', quantity: '1', unit: 'whole', category: 'produce', checked: false },
        ],
        calories: 650,
        protein_g: 52,
        carbs_g: 68,
        fat_g: 16,
        recipe_url: null,
        image_url: null,
      },
      {
        id: '3',
        type: 'snack',
        name: 'Greek Yogurt & Nuts',
        ingredients: [
          { name: 'Greek Yogurt', quantity: '1', unit: 'cup', category: 'dairy', checked: false },
          { name: 'Mixed Nuts', quantity: '0.25', unit: 'cup', category: 'pantry', checked: false },
          { name: 'Honey', quantity: '1', unit: 'tbsp', category: 'pantry', checked: false },
        ],
        calories: 320,
        protein_g: 24,
        carbs_g: 22,
        fat_g: 16,
        recipe_url: null,
        image_url: null,
      },
      {
        id: '4',
        type: 'dinner',
        name: 'Salmon & Sweet Potato',
        ingredients: [
          { name: 'Salmon Fillet', quantity: '6', unit: 'oz', category: 'protein', checked: false },
          { name: 'Sweet Potato', quantity: '1', unit: 'large', category: 'produce', checked: false },
          { name: 'Asparagus', quantity: '1', unit: 'bunch', category: 'produce', checked: false },
          { name: 'Avocado Oil', quantity: '1', unit: 'tbsp', category: 'pantry', checked: false },
          { name: 'Garlic', quantity: '3', unit: 'cloves', category: 'produce', checked: false },
        ],
        calories: 580,
        protein_g: 42,
        carbs_g: 44,
        fat_g: 24,
        recipe_url: null,
        image_url: null,
      },
    ],
  },
  {
    day: 'Tuesday',
    meals: [
      {
        id: '5',
        type: 'breakfast',
        name: 'Egg White Scramble',
        ingredients: [
          { name: 'Egg Whites', quantity: '6', unit: 'large', category: 'protein', checked: false },
          { name: 'Whole Eggs', quantity: '2', unit: 'large', category: 'protein', checked: false },
          { name: 'Spinach', quantity: '2', unit: 'cups', category: 'produce', checked: false },
          { name: 'Bell Pepper', quantity: '1', unit: 'medium', category: 'produce', checked: false },
          { name: 'Whole Wheat Toast', quantity: '2', unit: 'slices', category: 'grains', checked: false },
        ],
        calories: 440,
        protein_g: 42,
        carbs_g: 30,
        fat_g: 14,
        recipe_url: null,
        image_url: null,
      },
      {
        id: '6',
        type: 'lunch',
        name: 'Turkey Wrap',
        ingredients: [
          { name: 'Ground Turkey', quantity: '6', unit: 'oz', category: 'protein', checked: false },
          { name: 'Whole Wheat Tortilla', quantity: '1', unit: 'large', category: 'grains', checked: false },
          { name: 'Avocado', quantity: '0.5', unit: 'medium', category: 'produce', checked: false },
          { name: 'Tomato', quantity: '1', unit: 'medium', category: 'produce', checked: false },
          { name: 'Mixed Greens', quantity: '1', unit: 'cup', category: 'produce', checked: false },
        ],
        calories: 520,
        protein_g: 44,
        carbs_g: 38,
        fat_g: 20,
        recipe_url: null,
        image_url: null,
      },
      {
        id: '7',
        type: 'dinner',
        name: 'Lean Beef Stir Fry',
        ingredients: [
          { name: 'Lean Ground Beef', quantity: '6', unit: 'oz', category: 'protein', checked: false },
          { name: 'Brown Rice', quantity: '1', unit: 'cup', category: 'grains', checked: false },
          { name: 'Mixed Vegetables', quantity: '2', unit: 'cups', category: 'frozen', checked: false },
          { name: 'Soy Sauce', quantity: '2', unit: 'tbsp', category: 'pantry', checked: false },
          { name: 'Sesame Oil', quantity: '1', unit: 'tsp', category: 'pantry', checked: false },
          { name: 'Ginger', quantity: '1', unit: 'tbsp', category: 'produce', checked: false },
        ],
        calories: 620,
        protein_g: 46,
        carbs_g: 64,
        fat_g: 18,
        recipe_url: null,
        image_url: null,
      },
    ],
  },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type TabView = 'meals' | 'shopping';

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client, refreshClientData } = useAuth();
  const { logMeal, isMealLogged } = useFoodLog();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [activeTab, setActiveTab] = useState<TabView>('meals');
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [scannedFoods, setScannedFoods] = useState<NutritionInfo[]>([]);
  const [exportingMeals, setExportingMeals] = useState(false);
  const [exportingGrocery, setExportingGrocery] = useState(false);

  // Use client's coach-assigned meal plan if available, otherwise fall back to sample
  const activeMealPlan: MealPlanDay[] = useMemo(() => {
    if (client?.meal_plan && Array.isArray(client.meal_plan) && client.meal_plan.length > 0) {
      return client.meal_plan as MealPlanDay[];
    }
    return SAMPLE_MEAL_PLAN;
  }, [client?.meal_plan]);

  // Generate shopping list on mount and when meal plan changes
  useEffect(() => {
    const items = generateShoppingList(activeMealPlan);
    setShoppingItems(items);
  }, [activeMealPlan]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  const handleToggleItem = useCallback((name: string) => {
    setShoppingItems((prev) =>
      prev.map((item) =>
        item.name === name ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const handleScanResult = useCallback((info: NutritionInfo) => {
    setScannedFoods((prev) => [info, ...prev]);
  }, []);

  const handleLogMeal = useCallback(async (meal: { id: string; name: string; type: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }) => {
    if (isMealLogged(meal.name)) {
      Alert.alert('Already Logged', `${meal.name} is already in your food log.`);
      return;
    }
    await logMeal(meal);
    Alert.alert('Logged!', `${meal.name} added to your food log.`);
  }, [logMeal, isMealLogged]);

  const handleExportMealPlan = useCallback(async () => {
    setExportingMeals(true);
    try {
      await generateMealPlanPDF(activeMealPlan, {
        calories: client?.target_calories,
        protein: client?.target_protein,
        carbs: client?.target_carbs,
        fats: client?.target_fats,
      });
    } finally {
      setExportingMeals(false);
    }
  }, [activeMealPlan, client]);

  const handleExportGroceryList = useCallback(async () => {
    setExportingGrocery(true);
    try {
      await generateGroceryListPDF(shoppingItems);
    } finally {
      setExportingGrocery(false);
    }
  }, [shoppingItems]);

  // Filter meals by selected day
  const filteredMeals =
    selectedDay === 'All'
      ? activeMealPlan
      : activeMealPlan.filter((d) => d.day === selectedDay);

  // Compute daily totals
  const dailyTotals = filteredMeals.reduce(
    (acc, day) => {
      for (const meal of day.meals) {
        acc.calories += meal.calories || 0;
        acc.protein += meal.protein_g || 0;
        acc.carbs += meal.carbs_g || 0;
        acc.fat += meal.fat_g || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxxl * 2 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <BrandHeader title="Meals & Shopping" />

      {/* Food Log Quick Access */}
      <TouchableOpacity
        style={styles.foodLogBtn}
        onPress={() => router.push('/food-log')}
        activeOpacity={0.7}
      >
        <Ionicons name="nutrition-outline" size={18} color={colors.accent} />
        <Text style={styles.foodLogBtnText}>Open Food Log</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </TouchableOpacity>

      {/* Tab Toggle */}
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'meals' && styles.tabActive]}
          onPress={() => setActiveTab('meals')}
        >
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={activeTab === 'meals' ? colors.accent : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'meals' && styles.tabTextActive]}>
            Meal Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shopping' && styles.tabActive]}
          onPress={() => setActiveTab('shopping')}
        >
          <Ionicons
            name="cart-outline"
            size={16}
            color={activeTab === 'shopping' ? colors.accent : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'shopping' && styles.tabTextActive]}>
            Shopping List
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barcode Scanner / Food Search */}
      <BarcodeScannerButton onResult={handleScanResult} />

      {/* Scanned Foods */}
      {scannedFoods.length > 0 && (
        <Card style={styles.scannedCard}>
          <Text style={styles.scannedTitle}>Recently Scanned</Text>
          {scannedFoods.slice(0, 5).map((food, i) => (
            <View key={i} style={styles.scannedRow}>
              <Text style={styles.scannedName} numberOfLines={1}>{food.name}</Text>
              <Text style={styles.scannedMacro}>{food.calories ?? '--'} cal</Text>
              <Text style={styles.scannedMacro}>{food.protein_g ?? '--'}g P</Text>
            </View>
          ))}
        </Card>
      )}

      {activeTab === 'meals' ? (
        <>
          {/* Day Selector + Export */}
          <View style={styles.sectionHeader}>
            <DaySelector days={DAYS} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportMealPlan}
              disabled={exportingMeals}
              activeOpacity={0.7}
            >
              <Ionicons
                name={exportingMeals ? 'hourglass-outline' : 'download-outline'}
                size={14}
                color={colors.accent}
              />
              <Text style={styles.exportButtonText}>
                {exportingMeals ? 'Exporting...' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Daily Macro Summary */}
          <Card style={styles.macroSummary}>
            <Text style={styles.macroSummaryTitle}>
              {selectedDay === 'All' ? 'Weekly' : selectedDay} Totals
            </Text>
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyTotals.calories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
                {client?.target_calories && (
                  <Text style={styles.macroTarget}>/ {client.target_calories}</Text>
                )}
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyTotals.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
                {client?.target_protein && (
                  <Text style={styles.macroTarget}>/ {client.target_protein}g</Text>
                )}
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyTotals.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
                {client?.target_carbs && (
                  <Text style={styles.macroTarget}>/ {client.target_carbs}g</Text>
                )}
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{dailyTotals.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
                {client?.target_fats && (
                  <Text style={styles.macroTarget}>/ {client.target_fats}g</Text>
                )}
              </View>
            </View>
          </Card>

          {/* Meal Cards */}
          {filteredMeals.length === 0 ? (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No Meals Planned</Text>
                <Text style={styles.emptySubtitle}>
                  Your coach hasn't assigned meals for {selectedDay} yet.
                </Text>
              </View>
            </Card>
          ) : (
            filteredMeals.map((day) => (
              <View key={day.day}>
                {selectedDay === 'All' && (
                  <Text style={styles.dayHeader}>{day.day}</Text>
                )}
                {day.meals.map((meal) => (
                  <View key={meal.id}>
                    <MealCard meal={meal} />
                    <TouchableOpacity
                      style={[
                        styles.logMealBtn,
                        isMealLogged(meal.name) && styles.logMealBtnLogged,
                      ]}
                      onPress={() => handleLogMeal(meal)}
                      disabled={isMealLogged(meal.name)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isMealLogged(meal.name) ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={isMealLogged(meal.name) ? colors.green : colors.accent}
                      />
                      <Text
                        style={[
                          styles.logMealBtnText,
                          isMealLogged(meal.name) && styles.logMealBtnTextLogged,
                        ]}
                      >
                        {isMealLogged(meal.name) ? 'Logged' : 'Log This Meal'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </>
      ) : (
        <>
          {/* Shopping List + Export */}
          <View style={styles.shoppingHeader}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportGroceryList}
              disabled={exportingGrocery}
              activeOpacity={0.7}
            >
              <Ionicons
                name={exportingGrocery ? 'hourglass-outline' : 'download-outline'}
                size={14}
                color={colors.accent}
              />
              <Text style={styles.exportButtonText}>
                {exportingGrocery ? 'Exporting...' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
          </View>

          <ShoppingList items={shoppingItems} onToggleItem={handleToggleItem} />

          {/* Delivery Buttons */}
          <View style={styles.deliverySection}>
            <DeliveryButtons items={shoppingItems} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.accentMuted,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  macroSummary: {
    marginVertical: spacing.md,
  },
  macroSummaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing.sm,
  },
  macroValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  macroLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  macroTarget: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: 1,
  },
  dayHeader: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  deliverySection: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginBottom: 0,
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  exportButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
  scannedCard: {
    marginBottom: spacing.md,
  },
  scannedTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  scannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scannedName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  scannedMacro: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  foodLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  foodLogBtnText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  logMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  logMealBtnLogged: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: colors.green,
  },
  logMealBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
  logMealBtnTextLogged: {
    color: colors.green,
  },
});
