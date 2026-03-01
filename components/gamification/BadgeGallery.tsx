import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { BadgeDefinition, EarnedBadge } from '../../types';

interface BadgeGalleryProps {
  allBadges: BadgeDefinition[];
  earnedBadges: EarnedBadge[];
}

const CATEGORY_COLORS: Record<string, string> = {
  streak: colors.accent,
  checkins: colors.green,
  targets: colors.gold,
  lifestyle: '#a855f7',
};

const ICON_MAP: Record<string, string> = {
  flame: '\u{1F525}',
  fire: '\u{1F525}',
  zap: '\u{26A1}',
  shield: '\u{1F6E1}',
  diamond: '\u{1F48E}',
  crown: '\u{1F451}',
  rocket: '\u{1F680}',
  target: '\u{1F3AF}',
  award: '\u{1F3C6}',
  beef: '\u{1F969}',
  utensils: '\u{1F374}',
  footprints: '\u{1F463}',
  moon: '\u{1F319}',
  dumbbell: '\u{1F4AA}',
  trophy: '\u{1F3C6}',
};

export function BadgeGallery({ allBadges, earnedBadges }: BadgeGalleryProps) {
  const earnedSlugs = new Set(earnedBadges.map(b => b.slug));

  if (allBadges.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.count}>
          {earnedBadges.length}/{allBadges.length}
        </Text>
      </View>
      <View style={styles.grid}>
        {allBadges.map(badge => {
          const isEarned = earnedSlugs.has(badge.slug);
          const categoryColor = CATEGORY_COLORS[badge.category] || colors.textSecondary;

          return (
            <View
              key={badge.id}
              style={[
                styles.badgeItem,
                isEarned && { borderColor: categoryColor },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  isEarned
                    ? { backgroundColor: categoryColor + '22' }
                    : styles.lockedCircle,
                ]}
              >
                <Text style={[styles.icon, !isEarned && styles.lockedIcon]}>
                  {isEarned
                    ? ICON_MAP[badge.icon] || '\u{1F3C6}'
                    : '\u{1F512}'}
                </Text>
              </View>
              <Text
                style={[styles.badgeName, !isEarned && styles.lockedText]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
              <Text
                style={[styles.badgeDesc, !isEarned && styles.lockedText]}
                numberOfLines={2}
              >
                {badge.description}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeItem: {
    width: '31%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  lockedCircle: {
    backgroundColor: colors.border,
  },
  icon: {
    fontSize: 22,
  },
  lockedIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  badgeName: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 12,
  },
  lockedText: {
    color: colors.textTertiary,
    opacity: 0.6,
  },
});
