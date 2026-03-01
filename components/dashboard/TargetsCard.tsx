import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { Client, Checkin } from '../../types';

interface TargetsCardProps {
  client: Client;
  latestCheckin: Checkin | null;
}

export function TargetsCard({ client, latestCheckin }: TargetsCardProps) {
  const targets = [
    {
      label: 'Calories',
      current: latestCheckin?.calories,
      target: client.target_calories,
      unit: 'kcal',
    },
    {
      label: 'Protein',
      current: latestCheckin?.protein_g,
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
      <Text style={styles.title}>Daily Targets</Text>
      {targets.map((t) => {
        const pct = t.current && t.target ? Math.min((t.current / t.target) * 100, 100) : 0;
        const progressColor =
          pct >= 90 ? colors.green : pct >= 60 ? colors.yellow : colors.red;

        return (
          <View key={t.label} style={styles.target}>
            <View style={styles.labelRow}>
              <Text style={styles.targetLabel}>{t.label}</Text>
              <Text style={styles.targetValue}>
                {t.current?.toLocaleString() ?? '--'} / {t.target?.toLocaleString()}{' '}
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
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
