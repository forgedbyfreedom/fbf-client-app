import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { Client, Checkin } from '../../types';

interface TargetsCardProps {
  client: Client;
  latestCheckin: Checkin | null;
  foodLogTotals?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
}

export function TargetsCard({ client, latestCheckin, foodLogTotals }: TargetsCardProps) {
  const hasFoodLog = foodLogTotals && (foodLogTotals.calories > 0 || foodLogTotals.protein_g > 0);

  const targets = [
    {
      label: hasFoodLog ? 'Calories (Food Log)' : 'Calories',
      current: hasFoodLog ? Math.round(foodLogTotals!.calories) : latestCheckin?.calories,
      target: client.target_calories,
      unit: 'kcal',
    },
    {
      label: hasFoodLog ? 'Protein (Food Log)' : 'Protein',
      current: hasFoodLog ? Math.round(foodLogTotals!.protein_g) : latestCheckin?.protein_g,
      target: client.target_protein,
      unit: 'g',
    },
    {
      label: 'Steps',
      current: latestCheckin?.steps,
      target: client.target_steps,
      unit: '',
    },
  ].filter((t) => t.target);

  if (targets.length === 0) return null;

  return (
    <Card>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Daily Targets</Text>
        {Platform.OS === 'ios' && (
          <View style={styles.healthBadge}>
            <Ionicons name="heart" size={10} color="#FF2D55" />
            <Text style={styles.healthBadgeText}>Apple Health</Text>
          </View>
        )}
      </View>
      {targets.map((t) => {
        const pct = t.current && t.target ? Math.min((t.current / t.target) * 100, 100) : 0;
        const progressColor =
          pct >= 90 ? colors.green : pct >= 60 ? colors.yellow : colors.red;

        return (
          <View key={t.label} style={styles.target}>
            <View style={styles.labelRow}>
              <Text style={styles.targetLabel}>{t.label}</Text>
              <Text style={styles.targetValue}>
                {t.current?.toLocaleString() ?? '--'} / {t.target?.toLocaleString() ?? '--'}{' '}
                {t.unit}
              </Text>
            </View>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%`, backgroundColor: progressColor },
                ]}
              />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  healthBadgeText: {
    fontSize: 10,
    color: '#FF2D55',
    fontWeight: '600',
  },
  target: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  targetLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  targetValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  barBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
