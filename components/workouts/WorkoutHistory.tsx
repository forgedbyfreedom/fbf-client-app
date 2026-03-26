import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutLog } from '../../types';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { formatDuration, formatVolume } from '../../lib/workout-utils';

interface WorkoutHistoryProps {
  logs: WorkoutLog[];
}

export function WorkoutHistory({ logs }: WorkoutHistoryProps) {
  if (logs.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <View style={styles.emptyContent}>
          <Ionicons name="barbell-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Workout History</Text>
          <Text style={styles.emptySubtitle}>
            Complete your first workout to start building your history.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      {logs.slice(0, 10).map((log) => {
        const completedExercises = log.exercises.length;
        const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
        const hasPRs = log.prs_hit && log.prs_hit.length > 0;

        return (
          <Card key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={styles.logTitleRow}>
                <Text style={styles.logDayName} numberOfLines={1}>
                  {log.day_name}
                </Text>
                {hasPRs && (
                  <View style={styles.prBadge}>
                    <Ionicons name="trophy" size={10} color={colors.accent} />
                    <Text style={styles.prBadgeText}>{log.prs_hit.length} PR</Text>
                  </View>
                )}
              </View>
              <Text style={styles.logDate}>{formatLogDate(log.date)}</Text>
            </View>

            <View style={styles.logStats}>
              <View style={styles.stat}>
                <Ionicons name="timer-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.statValue}>
                  {log.duration_min ? formatDuration(log.duration_min) : '--'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="barbell-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.statValue}>{completedExercises} exercises</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="layers-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.statValue}>{totalSets} sets</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="flame-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.statValue}>{formatVolume(log.total_volume_lbs)} lbs</Text>
              </View>
            </View>

            {hasPRs && (
              <View style={styles.prSection}>
                {log.prs_hit.map((pr, i) => (
                  <View key={i} style={styles.prItem}>
                    <Ionicons name="trophy" size={12} color={colors.accent} />
                    <Text style={styles.prItemText}>
                      {pr.exercise_name}: {pr.weight_lbs} x {pr.reps} ({pr.estimated_1rm} 1RM)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

function formatLogDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logCard: {
    marginBottom: spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  logTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  logDayName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  logDate: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
  },
  logStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  prSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  prItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  prItemText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
