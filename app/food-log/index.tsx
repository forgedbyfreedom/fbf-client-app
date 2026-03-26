import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useFoodLog } from '../../hooks/useFoodLog';
import { FoodLogEntry } from '../../types';
import { RunningTotalsBar } from '../../components/nutrition/RunningTotalsBar';
import { FoodLogEntryRow } from '../../components/nutrition/FoodLogEntry';
import { EditFoodModal } from '../../components/nutrition/EditFoodModal';
import { QuickAddFood } from '../../components/nutrition/QuickAddFood';
import { Card } from '../../components/ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout', 'Other'];

export default function FoodLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client } = useAuth();
  const {
    entries,
    totals,
    entriesByMeal,
    loading,
    addFood,
    removeFood,
    updateFood,
    clearLog,
    populateFromMealPlan,
    hasEntries,
  } = useFoodLog();

  const [editEntry, setEditEntry] = useState<FoodLogEntry | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickAddMeal, setQuickAddMeal] = useState<string | undefined>(undefined);

  const targets = {
    calories: client?.target_calories ?? null,
    protein: client?.target_protein ?? null,
    carbs: client?.target_carbs ?? null,
    fats: client?.target_fats ?? null,
  };

  const handleEdit = useCallback((entry: FoodLogEntry) => {
    setEditEntry(entry);
    setEditVisible(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Food', 'Remove this item from your food log?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeFood(id) },
      ]);
    },
    [removeFood]
  );

  const handleSaveEdit = useCallback(
    (id: string, updates: Partial<FoodLogEntry>) => {
      updateFood(id, updates);
    },
    [updateFood]
  );

  const handleQuickAdd = useCallback(
    (mealLabel?: string) => {
      setQuickAddMeal(mealLabel);
      setQuickAddVisible(true);
    },
    []
  );

  const handlePopulateFromPlan = useCallback(() => {
    if (hasEntries) {
      Alert.alert(
        'Load Meal Plan',
        'This will add your meal plan items to the existing log. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Meals', onPress: () => populateFromMealPlan() },
        ]
      );
    } else {
      populateFromMealPlan();
    }
  }, [hasEntries, populateFromMealPlan]);

  const handleClearLog = useCallback(() => {
    Alert.alert('Clear Food Log', 'Remove all food entries for today?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearLog() },
    ]);
  }, [clearLog]);

  // Sort meal groups by MEAL_ORDER
  const sortedMealLabels = Object.keys(entriesByMeal).sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a);
    const bi = MEAL_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Log</Text>
        <View style={styles.headerActions}>
          {hasEntries && (
            <TouchableOpacity onPress={handleClearLog} style={styles.headerAction}>
              <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Running Totals */}
        <RunningTotalsBar totals={totals} targets={targets} />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleQuickAdd()}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.actionBtnText}>Quick Add</Text>
          </TouchableOpacity>
          {client?.meal_plan && Array.isArray(client.meal_plan) && client.meal_plan.length > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={handlePopulateFromPlan}>
              <Ionicons name="restaurant-outline" size={18} color={colors.accent} />
              <Text style={styles.actionBtnText}>From Meal Plan</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Food Log by Meal */}
        {entries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Ionicons name="nutrition-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Foods Logged</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Quick Add" to log a food, or load today's meals from your meal plan.
              </Text>
            </View>
          </Card>
        ) : (
          sortedMealLabels.map((mealLabel) => (
            <View key={mealLabel} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealLabel}>{mealLabel}</Text>
                <TouchableOpacity
                  style={styles.addToMealBtn}
                  onPress={() => handleQuickAdd(mealLabel)}
                >
                  <Ionicons name="add" size={16} color={colors.accent} />
                  <Text style={styles.addToMealText}>Add Food</Text>
                </TouchableOpacity>
              </View>
              <Card style={styles.mealCard}>
                {entriesByMeal[mealLabel].map((entry) => (
                  <FoodLogEntryRow
                    key={entry.id}
                    entry={entry}
                    onPress={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </Card>
            </View>
          ))
        )}

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.xl }]}
        onPress={() => handleQuickAdd()}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modals */}
      <EditFoodModal
        visible={editVisible}
        entry={editEntry}
        onSave={handleSaveEdit}
        onDelete={(id) => {
          removeFood(id);
          setEditVisible(false);
        }}
        onClose={() => setEditVisible(false)}
      />

      <QuickAddFood
        visible={quickAddVisible}
        mealLabel={quickAddMeal}
        onAdd={addFood}
        onClose={() => setQuickAddVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerAction: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyCard: {
    marginTop: spacing.md,
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
    lineHeight: 20,
  },
  mealSection: {
    marginBottom: spacing.lg,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mealLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addToMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentMuted,
  },
  addToMealText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
  mealCard: {
    padding: 0,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
