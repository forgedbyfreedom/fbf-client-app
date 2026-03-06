import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChatChannel } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface ChannelPillsProps {
  channels: ChatChannel[];
  activeId: string;
  onSelect: (channelId: string) => void;
}

export function ChannelPills({ channels, activeId, onSelect }: ChannelPillsProps) {
  if (channels.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {channels.map(ch => {
        const isActive = ch.id === activeId;
        const label = ch.type === 'group' ? `# ${ch.name}` : ch.name;

        return (
          <TouchableOpacity
            key={ch.id}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(ch.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
});
