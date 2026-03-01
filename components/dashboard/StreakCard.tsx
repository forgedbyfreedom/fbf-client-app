import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { StreakData } from '../../types';

interface StreakCardProps {
  streak: StreakData | null;
}

export function StreakCard({ streak }: StreakCardProps) {
  const current = streak?.current_streak ?? 0;
  const best = streak?.best_streak ?? 0;
  const total = streak?.total_checkins ?? 0;
  const isActive = current > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.streakMain}>
          <Text style={[styles.fireIcon, !isActive && styles.inactive]}>
            {isActive ? '\u{1F525}' : '\u{1F6AB}'}
          </Text>
          <View>
            <Text style={[styles.streakCount, isActive && styles.activeText]}>
              {current} day{current !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.streakLabel}>
              {isActive ? 'Current Streak' : 'No active streak'}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{best}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fireIcon: {
    fontSize: 32,
  },
  inactive: {
    opacity: 0.4,
  },
  streakCount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeText: {
    color: colors.accent,
  },
  streakLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
