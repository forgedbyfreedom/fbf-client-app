import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Challenge } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { challengeTypeLabel, daysRemaining, daysUntilStart, formatDate } from '../../lib/challenge-utils';

interface ChallengeCardProps {
  challenge: Challenge;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#3b82f6',
  active: colors.accent,
  completed: colors.green,
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'UPCOMING',
  active: 'ACTIVE',
  completed: 'COMPLETED',
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const router = useRouter();
  const statusColor = STATUS_COLORS[challenge.status] || colors.textSecondary;

  const remaining = challenge.status === 'active' ? daysRemaining(challenge.end_date) : 0;
  const untilStart = challenge.status === 'upcoming' ? daysUntilStart(challenge.start_date) : 0;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: statusColor }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/challenges/${challenge.id}`)}
    >
      <View style={styles.topRow}>
        <View style={[styles.typeBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.typeBadgeText, { color: statusColor }]}>
            {challengeTypeLabel(challenge.type)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[challenge.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.name}>{challenge.name}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {challenge.description}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>
            {formatDate(challenge.start_date)} — {formatDate(challenge.end_date)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>{challenge.duration_weeks} weeks</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={14} color={colors.accent} />
          <Text style={[styles.metaText, { color: colors.accent }]}>
            {challenge.participant_count} participants
          </Text>
        </View>

        {challenge.status === 'active' && remaining > 0 && (
          <View style={styles.countdown}>
            <Ionicons name="flame" size={14} color={colors.accent} />
            <Text style={styles.countdownText}>{remaining}d left</Text>
          </View>
        )}

        {challenge.status === 'upcoming' && untilStart > 0 && (
          <View style={styles.countdown}>
            <Ionicons name="hourglass-outline" size={14} color="#3b82f6" />
            <Text style={[styles.countdownText, { color: '#3b82f6' }]}>
              Starts in {untilStart}d
            </Text>
          </View>
        )}
      </View>

      {challenge.prize_pool_description && (
        <View style={styles.prizeRow}>
          <Ionicons name="trophy" size={14} color={colors.gold} />
          <Text style={styles.prizeText}>{challenge.prize_pool_description}</Text>
        </View>
      )}

      {/* Entry fee display removed — requires Apple IAP */}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prizeText: {
    fontSize: fontSize.xs,
    color: colors.gold,
    fontWeight: '600',
  },
  feeRow: {
    marginTop: spacing.xs,
  },
  feeText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
