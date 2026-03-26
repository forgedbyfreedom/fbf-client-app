import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { MOOD_LABELS, STRESS_LABELS } from '../../lib/constants';

interface MoodSelectorProps {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  max?: number;
  inverted?: boolean;
}

export function MoodSelector({ value, onChange, label = 'Mood', max = 10, inverted = false }: MoodSelectorProps) {
  const getMoodColor = (v: number) => {
    if (inverted) {
      // For stress: low = green (good), high = red (bad)
      if (v <= 3) return colors.green;
      if (v <= 6) return colors.yellow;
      return colors.red;
    }
    if (v <= 2) return colors.red;
    if (v <= 4) return colors.accent;
    if (v <= 5) return colors.yellow;
    return colors.green;
  };

  const labels = inverted ? STRESS_LABELS : MOOD_LABELS;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: getMoodColor(value) }]}>
          {value}/{max}
          {labels[value] ? ` - ${labels[value]}` : ''}
        </Text>
      </View>
      <View style={styles.row}>
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={[
              styles.dot,
              {
                backgroundColor:
                  v <= value ? getMoodColor(value) : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.dotText,
                { color: v <= value ? '#fff' : colors.textTertiary },
              ]}
            >
              {v}
            </Text>
          </TouchableOpacity>
        ))}
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
