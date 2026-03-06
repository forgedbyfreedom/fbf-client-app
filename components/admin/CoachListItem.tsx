import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrgCoach } from '../../types';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

interface CoachListItemProps {
  coach: OrgCoach;
}

export function CoachListItem({ coach }: CoachListItemProps) {
  const initials = (coach.profiles.full_name || coach.profiles.email)[0].toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{coach.profiles.full_name || coach.profiles.email}</Text>
        <Text style={styles.email}>{coach.profiles.email}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.roleBadge, coach.role === 'org_admin' && styles.adminBadge]}>
          <Text style={[styles.roleText, coach.role === 'org_admin' && styles.adminText]}>
            {coach.role === 'org_admin' ? 'Admin' : 'Coach'}
          </Text>
        </View>
        <Text style={styles.count}>{coach.client_count} clients</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  adminBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  roleText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  adminText: {
    color: colors.green,
  },
  count: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
