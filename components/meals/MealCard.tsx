import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { MealEntry } from '../../lib/nutrition-api';

interface MealCardProps {
  meal: MealEntry;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

export function MealCard({ meal }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = MEAL_ICONS[meal.type] || 'restaurant-outline';

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.mealTypeIcon}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.mealType}>{meal.type.toUpperCase()}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
        </View>
        <View style={styles.macros}>
          {meal.calories != null && (
            <Text style={styles.macroText}>{meal.calories} cal</Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          <View style={styles.macroRow}>
            {meal.protein_g != null && (
              <View style={styles.macroPill}>
                <Text style={styles.macroPillLabel}>Protein</Text>
                <Text style={styles.macroPillValue}>{meal.protein_g}g</Text>
              </View>
            )}
            {meal.carbs_g != null && (
              <View style={styles.macroPill}>
                <Text style={styles.macroPillLabel}>Carbs</Text>
                <Text style={styles.macroPillValue}>{meal.carbs_g}g</Text>
              </View>
            )}
            {meal.fat_g != null && (
              <View style={styles.macroPill}>
                <Text style={styles.macroPillLabel}>Fat</Text>
                <Text style={styles.macroPillValue}>{meal.fat_g}g</Text>
              </View>
            )}
          </View>

          {meal.ingredients.length > 0 && (
            <View style={styles.ingredientList}>
              <Text style={styles.ingredientHeader}>Ingredients</Text>
              {meal.ingredients.map((ing, i) => (
                <Text key={i} style={styles.ingredientText}>
                  {ing.quantity} {ing.unit} {ing.name}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  mealType: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  macros: {
    marginRight: spacing.sm,
  },
  macroText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  details: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macroPill: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  macroPillValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ingredientList: {
    gap: spacing.xs,
  },
  ingredientHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  ingredientText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
});
