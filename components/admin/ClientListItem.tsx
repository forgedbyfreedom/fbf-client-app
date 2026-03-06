import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminClient } from '../../types';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

interface ClientListItemProps {
  client: AdminClient;
  onPress: () => void;
}

export function ClientListItem({ client, onPress }: ClientListItemProps) {
  const activeAssignment = client.client_coach_assignments?.find(a => a.is_active);
  const coachName = activeAssignment?.profiles?.full_name || 'Unassigned';
  const status = client.client_metrics?.[0]?.status || 'green';

  const statusColors = {
    green: colors.green,
    yellow: colors.yellow,
    red: colors.red,
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {client.first_name} {client.last_name}
            </Text>
            {!client.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={styles.coach}>{coachName}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  inactiveText: {
    fontSize: fontSize.xs,
    color: colors.red,
    fontWeight: '600',
  },
  coach: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
