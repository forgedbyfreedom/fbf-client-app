import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { SupplementCardItem } from './SupplementCard';

interface TimelineItem extends SupplementCardItem {
  _type: 'supplement' | 'peptide' | 'ped' | 'medical';
  _key: string;
  _taken: boolean;
}

interface SupplementTimelineProps {
  items: TimelineItem[];
}

const TIME_SLOTS = [
  { key: 'morning', label: 'Morning', icon: 'sunny-outline' as const, keywords: ['morning', 'am', 'breakfast', 'wake', 'fasted'] },
  { key: 'pre_workout', label: 'Pre-Workout', icon: 'barbell-outline' as const, keywords: ['pre-workout', 'pre workout', 'before workout', 'before training'] },
  { key: 'post_workout', label: 'Post-Workout', icon: 'trophy-outline' as const, keywords: ['post-workout', 'post workout', 'after workout', 'after training'] },
  { key: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' as const, keywords: ['afternoon', 'lunch', 'midday', 'noon', 'pm'] },
  { key: 'evening', label: 'Evening', icon: 'moon-outline' as const, keywords: ['evening', 'dinner', 'night', 'pm'] },
  { key: 'before_bed', label: 'Before Bed', icon: 'bed-outline' as const, keywords: ['bed', 'sleep', 'bedtime', 'before bed'] },
  { key: 'as_needed', label: 'As Needed', icon: 'calendar-outline' as const, keywords: ['as needed', 'prn', 'weekly', 'twice', '2x', '3x', 'mon', 'wed', 'fri'] },
];

function classifyTiming(item: TimelineItem): string {
  const text = `${item.timing || ''} ${item.frequency || ''} ${item.notes || ''}`.toLowerCase();

  for (const slot of TIME_SLOTS) {
    if (slot.keywords.some((kw) => text.includes(kw))) {
      return slot.key;
    }
  }

  return 'morning'; // default
}

export function SupplementTimeline({ items }: SupplementTimelineProps) {
  // Group items by time slot
  const grouped: Record<string, TimelineItem[]> = {};
  for (const item of items) {
    const slot = classifyTiming(item);
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(item);
  }

  // Filter to only slots that have items
  const activeSlots = TIME_SLOTS.filter((slot) => grouped[slot.key]?.length > 0);

  if (activeSlots.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Daily Timeline</Text>
      {activeSlots.map((slot, slotIndex) => {
        const slotItems = grouped[slot.key] || [];
        const allDone = slotItems.every((i) => i._taken);
        const someDone = slotItems.some((i) => i._taken);

        return (
          <View key={slot.key} style={styles.slotContainer}>
            {/* Timeline line */}
            {slotIndex < activeSlots.length - 1 && <View style={styles.timelineLine} />}

            {/* Dot */}
            <View
              style={[
                styles.dot,
                allDone && styles.dotDone,
                !allDone && someDone && styles.dotPartial,
              ]}
            >
              {allDone ? (
                <Ionicons name="checkmark" size={10} color="#fff" />
              ) : (
                <Ionicons name={slot.icon} size={10} color={someDone ? colors.accent : colors.textTertiary} />
              )}
            </View>

            {/* Slot content */}
            <View style={styles.slotContent}>
              <View style={styles.slotHeader}>
                <Text style={[styles.slotLabel, allDone && styles.slotLabelDone]}>
                  {slot.label}
                </Text>
                <Text style={styles.slotCount}>
                  {slotItems.filter((i) => i._taken).length}/{slotItems.length}
                </Text>
              </View>
              {slotItems.map((item) => (
                <View
                  key={item._key}
                  style={[styles.timelineItem, item._taken && styles.timelineItemDone]}
                >
                  <View style={[styles.itemDot, item._taken && styles.itemDotDone]} />
                  <Text
                    style={[styles.itemName, item._taken && styles.itemNameDone]}
                    numberOfLines={1}
                  >
                    {item.name || item.compound}
                  </Text>
                  <Text style={styles.itemDose}>{item.dose}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Helper to build timeline items from the various data arrays
export function buildTimelineItems(
  supplements: Array<Record<string, any>>,
  peptides: Array<Record<string, any>>,
  peds: Array<Record<string, any>>,
  medical: Array<Record<string, any>>,
  complianceMap: Record<string, boolean>,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const s of supplements) {
    const key = `supplement_${s.name}`;
    items.push({
      name: s.name,
      dose: s.dose,
      timing: s.timing || s.frequency,
      frequency: s.frequency,
      notes: s.notes,
      _type: 'supplement',
      _key: key,
      _taken: !!complianceMap[key],
    });
  }

  for (const p of peptides) {
    const key = `peptide_${p.name}`;
    items.push({
      name: p.name,
      dose: p.dose,
      timing: p.timing,
      frequency: p.frequency,
      notes: p.notes,
      _type: 'peptide',
      _key: key,
      _taken: !!complianceMap[key],
    });
  }

  for (const c of peds) {
    const key = `ped_${c.compound || c.name}`;
    items.push({
      name: c.compound || c.name,
      compound: c.compound,
      dose: c.dose,
      timing: c.timing,
      frequency: c.frequency,
      route: c.route,
      notes: c.notes,
      _type: 'ped',
      _key: key,
      _taken: !!complianceMap[key],
    });
  }

  for (const m of medical) {
    const key = `medical_${m.name}`;
    items.push({
      name: m.name,
      dose: m.dose,
      timing: m.timing,
      frequency: m.frequency,
      notes: m.notes,
      _type: 'medical',
      _key: key,
      _taken: !!complianceMap[key],
    });
  }

  return items;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  slotContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 10,
    top: 22,
    bottom: -spacing.lg,
    width: 1,
    backgroundColor: colors.border,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    zIndex: 1,
  },
  dotDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  dotPartial: {
    borderColor: colors.accent,
  },
  slotContent: {
    flex: 1,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  slotLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotLabelDone: {
    color: colors.green,
  },
  slotCount: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  timelineItemDone: {
    opacity: 0.6,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  itemDotDone: {
    backgroundColor: colors.green,
  },
  itemName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  itemNameDone: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  itemDose: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
});
