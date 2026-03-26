import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface RunningTotalsBarProps {
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
  };
}

interface MacroBarProps {
  label: string;
  current: number;
  target: number | null;
  unit: string;
  color: string;
}

function MacroBar({ label, current, target, unit, color }: MacroBarProps) {
  const pct = target ? Math.min((current / target) * 100, 100) : 0;
  const progressColor = target
    ? pct >= 90
      ? colors.green
      : pct >= 60
        ? colors.yellow
        : color
    : color;

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroTop}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {Math.round(current)}
          {target ? ` / ${target}` : ''} {unit}
        </Text>
      </View>
      {target ? (
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: progressColor }]} />
        </View>
      ) : null}
    </View>
  );
}

export function RunningTotalsBar({ totals, targets }: RunningTotalsBarProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Today's Totals</Text>
      <View style={styles.grid}>
        <MacroBar
          label="Calories"
          current={totals.calories}
          target={targets.calories}
          unit="kcal"
          color={colors.accent}
        />
        <MacroBar
          label="Protein"
          current={totals.protein_g}
          target={targets.protein}
          unit="g"
          color="#ef4444"
        />
        <MacroBar
          label="Carbs"
          current={totals.carbs_g}
          target={targets.carbs}
          unit="g"
          color="#eab308"
        />
        <MacroBar
          label="Fat"
          current={totals.fat_g}
          target={targets.fats}
          unit="g"
          color="#3b82f6"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.md,
  },
  macroItem: {
    gap: spacing.xs,
  },
  macroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  macroValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
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
