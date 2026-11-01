import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCoachInbox } from '../../lib/coach-inbox';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

/** Home-screen entry to Coach updates; highlighted while something is unread. */
export function CoachUpdatesCard() {
  const router = useRouter();
  const { items, unread, loaded } = useCoachInbox();
  if (!loaded || items.length === 0) return null;
  const latest = items[0];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/coach-updates')}
      style={[styles.card, unread > 0 && styles.cardNew]}
    >
      <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={22} color={colors.accent} />
      <View style={styles.flex}>
        <Text style={styles.title}>
          {unread > 0 ? `${unread} new from your coach` : 'Coach updates'}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {latest.body}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardNew: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  flex: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
});
