import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChallengeEntry, ChallengeType } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface ChallengeLeaderboardProps {
  entries: ChallengeEntry[];
  currentClientId: string;
  challengeType: ChallengeType;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function formatMetric(entry: ChallengeEntry, type: ChallengeType): string {
  if (type === 'steps') {
    return entry.current_value.toLocaleString();
  }
  const sign = entry.change_pct >= 0 ? '+' : '';
  return `${sign}${entry.change_pct.toFixed(1)}%`;
}

export function ChallengeLeaderboard({
  entries,
  currentClientId,
  challengeType,
}: ChallengeLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="podium-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>No participants yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.pctBadge}>
          <Ionicons name="analytics-outline" size={12} color={colors.accent} />
          <Text style={styles.pctBadgeText}>
            {challengeType === 'steps' ? 'TOTAL STEPS' : '% BASED'}
          </Text>
        </View>
      </View>

      {entries.map((entry) => {
        const isMe = entry.client_id === currentClientId;
        const isTopThree = entry.rank <= 3;
        const medalColor = isTopThree ? MEDAL_COLORS[entry.rank - 1] : undefined;

        return (
          <View
            key={entry.id}
            style={[
              styles.row,
              isMe && styles.rowHighlighted,
              entry.rank === 1 && styles.rowFirst,
            ]}
          >
            <View style={styles.rankCell}>
              {isTopThree ? (
                <View style={[styles.medalCircle, { backgroundColor: `${medalColor}30` }]}>
                  <Text style={[styles.rankText, { color: medalColor }]}>{entry.rank}</Text>
                </View>
              ) : (
                <Text style={styles.rankNumber}>{entry.rank}</Text>
              )}
            </View>

            <View style={styles.nameCell}>
              <Text style={[styles.nameText, isMe && styles.nameTextMe]} numberOfLines={1}>
                {entry.client_name}
                {isMe ? ' (You)' : ''}
              </Text>
            </View>

            <View style={styles.valueCell}>
              <Text
                style={[
                  styles.valueText,
                  isTopThree && { color: medalColor },
                  isMe && styles.valueTextMe,
                ]}
              >
                {formatMetric(entry, challengeType)}
              </Text>
            </View>

            <View style={styles.verifiedCell}>
              {entry.verified && (
                <Ionicons name="checkmark-circle" size={16} color={colors.green} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  pctBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowHighlighted: {
    backgroundColor: 'rgba(255, 106, 0, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  rowFirst: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  rankCell: {
    width: 36,
    alignItems: 'center',
  },
  medalCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  rankNumber: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  nameCell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  nameText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  nameTextMe: {
    color: colors.accent,
    fontWeight: '700',
  },
  valueCell: {
    minWidth: 80,
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
  },
  valueText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  valueTextMe: {
    color: colors.accent,
  },
  verifiedCell: {
    width: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
});
