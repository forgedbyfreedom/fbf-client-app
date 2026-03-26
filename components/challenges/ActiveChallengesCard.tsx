import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useChallenges } from '../../hooks/useChallenges';
import { daysRemaining } from '../../lib/challenge-utils';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

export function ActiveChallengesCard() {
  const router = useRouter();
  const { activeChallenges, upcomingChallenges, loading } = useChallenges();

  if (loading) return null;

  const totalActive = activeChallenges.length;
  const totalUpcoming = upcomingChallenges.length;

  if (totalActive === 0 && totalUpcoming === 0) {
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        activeOpacity={0.7}
        onPress={() => router.push('/challenges')}
      >
        <Ionicons name="trophy-outline" size={22} color={colors.textTertiary} />
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>Challenges</Text>
          <Text style={styles.emptyText}>No active challenges — stay tuned!</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push('/challenges')}
    >
      <View style={styles.headerRow}>
        <Ionicons name="trophy" size={20} color={colors.accent} />
        <Text style={styles.title}>Challenges</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{totalActive} active</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>

      {activeChallenges.slice(0, 2).map((challenge) => {
        const remaining = daysRemaining(challenge.end_date);
        return (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/challenges/${challenge.id}`)}
          >
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeName} numberOfLines={1}>
                {challenge.name}
              </Text>
              <Text style={styles.challengeMeta}>
                {challenge.participant_count} participants
              </Text>
            </View>
            <View style={styles.daysLeft}>
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={styles.daysLeftText}>{remaining}d</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {totalUpcoming > 0 && (
        <Text style={styles.upcomingHint}>
          + {totalUpcoming} upcoming challenge{totalUpcoming > 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyContent: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  challengeMeta: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  daysLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysLeftText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  upcomingHint: {
    fontSize: fontSize.xs,
    color: '#3b82f6',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
