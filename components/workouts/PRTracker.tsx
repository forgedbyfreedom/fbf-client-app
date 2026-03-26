import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalRecord } from '../../types';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { PRCategory, getPRCategoryName, getPRCategory } from '../../lib/workout-utils';

interface PRTrackerProps {
  personalRecords: Record<PRCategory, PersonalRecord | null>;
  prHistory: PersonalRecord[];
}

export function PRTracker({ personalRecords, prHistory }: PRTrackerProps) {
  const categories: PRCategory[] = ['bench', 'squat', 'deadlift'];
  const hasPRs = categories.some((c) => personalRecords[c] !== null);

  if (!hasPRs && prHistory.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <View style={styles.emptyContent}>
          <Ionicons name="trophy-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No PRs Yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete workouts with bench, squat, or deadlift to start tracking PRs.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Personal Records</Text>

      <View style={styles.prGrid}>
        {categories.map((category) => {
          const pr = personalRecords[category];
          return (
            <Card key={category} style={styles.prCard}>
              <View style={styles.prHeader}>
                <Ionicons name="trophy" size={16} color={pr ? colors.accent : colors.textTertiary} />
                <Text style={styles.prCategory}>{getPRCategoryName(category)}</Text>
              </View>
              {pr ? (
                <>
                  <Text style={styles.pr1rm}>{pr.estimated_1rm}</Text>
                  <Text style={styles.pr1rmLabel}>Est. 1RM (lbs)</Text>
                  <View style={styles.prDetail}>
                    <Text style={styles.prDetailText}>
                      {pr.weight_lbs} x {pr.reps}
                    </Text>
                  </View>
                  <Text style={styles.prDate}>{formatDate(pr.date)}</Text>
                </>
              ) : (
                <View style={styles.noPR}>
                  <Text style={styles.noPRText}>--</Text>
                  <Text style={styles.prDate}>No record</Text>
                </View>
              )}
            </Card>
          );
        })}
      </View>

      {/* PR History Mini Chart */}
      {prHistory.length > 1 && (
        <Card style={styles.historyCard}>
          <Text style={styles.historyTitle}>PR Progression</Text>
          {categories.map((category) => {
            const catHistory = prHistory
              .filter((pr) => getPRCategory(pr.exercise_name) === category)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (catHistory.length < 2) return null;

            const maxVal = Math.max(...catHistory.map((p) => p.estimated_1rm));
            const minVal = Math.min(...catHistory.map((p) => p.estimated_1rm));
            const range = maxVal - minVal || 1;

            return (
              <View key={category} style={styles.chartSection}>
                <Text style={styles.chartLabel}>{getPRCategoryName(category)}</Text>
                <View style={styles.chartContainer}>
                  {catHistory.map((pr, i) => {
                    const height = ((pr.estimated_1rm - minVal) / range) * 40 + 10;
                    return (
                      <View key={i} style={styles.barWrapper}>
                        <Text style={styles.barValue}>{pr.estimated_1rm}</Text>
                        <View
                          style={[
                            styles.bar,
                            {
                              height,
                              backgroundColor: i === catHistory.length - 1 ? colors.accent : colors.accentMuted,
                            },
                          ]}
                        />
                        <Text style={styles.barDate}>
                          {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  prGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  prCategory: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pr1rm: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.accent,
  },
  pr1rmLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
  },
  prDetail: {
    marginTop: spacing.xs,
  },
  prDetailText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  prDate: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
  },
  noPR: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  noPRText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textTertiary,
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
  historyCard: {
    marginTop: spacing.sm,
  },
  historyTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartSection: {
    marginBottom: spacing.lg,
  },
  chartLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    gap: spacing.xs,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bar: {
    width: '80%',
    maxWidth: 30,
    borderRadius: borderRadius.sm,
    minHeight: 10,
  },
  barDate: {
    fontSize: 8,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
});
