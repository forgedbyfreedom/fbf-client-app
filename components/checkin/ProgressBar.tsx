import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { TOTAL_STEPS } from '../../providers/CheckinProvider';

interface ProgressBarProps {
  step: number;
}

const STEP_LABELS = [
  'Body & Wellness',
  'Nutrition',
  'Activity',
  'Sleep',
  'Supplements',
  'Recommendations',
  'Notes & Photos',
];

export function ProgressBar({ step }: ProgressBarProps) {
  const pct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{STEP_LABELS[step]}</Text>
        <Text style={styles.count}>
          {step + 1} / {TOTAL_STEPS}
        </Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  barBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
});
