import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { Checkin } from '../../types';

interface HistoryListProps {
  checkins: Checkin[];
}

export function HistoryList({ checkins }: HistoryListProps) {
  if (checkins.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No check-in history yet</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Recent Check-ins</Text>
      {checkins.map((c) => {
        const date = new Date(c.date + 'T00:00:00');
        const dayStr = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const moodColor =
          (c.mood_rating ?? 0) >= 7
            ? colors.green
            : (c.mood_rating ?? 0) >= 4
            ? colors.yellow
            : colors.red;

        return (
          <View key={c.id} style={styles.item}>
            <View style={styles.dateCol}>
              <Text style={styles.dateText}>{dayStr}</Text>
            </View>
            <View style={styles.statsCol}>
              {c.weight_lbs && (
                <Text style={styles.statText}>{c.weight_lbs} lbs</Text>
              )}
              {c.calories && (
                <Text style={styles.statText}>{c.calories} kcal</Text>
              )}
              {c.steps && (
                <Text style={styles.statText}>
                  {c.steps.toLocaleString()} steps
                </Text>
              )}
            </View>
            <View style={styles.indicatorCol}>
              {c.mood_rating && (
                <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
              )}
              {c.training_done && (
                <Ionicons name="barbell-outline" size={14} color={colors.accent} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateCol: {
    width: 100,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statsCol: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  indicatorCol: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
