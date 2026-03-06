import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrgCoach } from '../../types';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

interface CoachPickerProps {
  coaches: OrgCoach[];
  selectedId: string | null;
  onSelect: (coachUserId: string) => void;
  loading?: boolean;
}

export function CoachPicker({ coaches, selectedId, onSelect, loading }: CoachPickerProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {coaches.map(coach => {
        const isSelected = coach.user_id === selectedId;
        return (
          <TouchableOpacity
            key={coach.user_id}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(coach.user_id)}
            activeOpacity={0.7}
          >
            <View style={styles.left}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(coach.profiles.full_name || coach.profiles.email)[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.name}>{coach.profiles.full_name || coach.profiles.email}</Text>
                <Text style={styles.count}>{coach.client_count} clients</Text>
              </View>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  itemSelected: {
    borderColor: colors.accent,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  name: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  count: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
