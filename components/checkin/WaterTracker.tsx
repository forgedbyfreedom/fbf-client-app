import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface WaterTrackerProps {
  value: number;
  onChange: (v: number) => void;
}

const QUICK_ADD = [8, 16, 32];

export function WaterTracker({ value, onChange }: WaterTrackerProps) {
  const pct = Math.min((value / 128) * 100, 100);
  const barColor = pct >= 100 ? colors.green : pct >= 50 ? '#06b6d4' : '#3b82f6';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Water</Text>
        <Text style={styles.value}>{value} oz</Text>
      </View>
      <View style={styles.barBg}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]}
        />
      </View>
      <View style={styles.buttonsRow}>
        {QUICK_ADD.map((oz) => (
          <TouchableOpacity
            key={oz}
            style={styles.quickBtn}
            onPress={() => onChange(value + oz)}
          >
            <Text style={styles.quickBtnText}>+{oz}oz</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.quickBtn, styles.resetBtn]}
          onPress={() => onChange(0)}
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  barBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickBtnText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  resetBtn: {
    marginLeft: 'auto',
  },
  resetText: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
  },
});
