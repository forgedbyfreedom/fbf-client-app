import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodLogEntry as FoodLogEntryType } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface FoodLogEntryProps {
  entry: FoodLogEntryType;
  onPress: (entry: FoodLogEntryType) => void;
  onDelete: (id: string) => void;
}

const SOURCE_ICONS: Record<string, string> = {
  manual: 'create-outline',
  meal_plan: 'restaurant-outline',
  barcode: 'barcode-outline',
};

export function FoodLogEntryRow({ entry, onPress, onDelete }: FoodLogEntryProps) {
  const effectiveCals = Math.round(entry.calories * entry.quantity);
  const effectiveProtein = Math.round(entry.protein_g * entry.quantity);
  const effectiveCarbs = Math.round(entry.carbs_g * entry.quantity);
  const effectiveFat = Math.round(entry.fat_g * entry.quantity);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(entry)} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={(SOURCE_ICONS[entry.source] || 'nutrition-outline') as keyof typeof Ionicons.glyphMap}
          size={16}
          color={colors.accent}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.meta}>
          {entry.serving_size}
          {entry.quantity !== 1 ? ` x${entry.quantity}` : ''}
        </Text>
      </View>
      <View style={styles.macros}>
        <Text style={styles.macroMain}>{effectiveCals} cal</Text>
        <Text style={styles.macroSub}>
          P:{effectiveProtein} C:{effectiveCarbs} F:{effectiveFat}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(entry.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={16} color={colors.red} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  macros: {
    alignItems: 'flex-end',
  },
  macroMain: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  macroSub: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
});
