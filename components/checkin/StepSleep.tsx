import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { SLEEP_QUALITY_LABELS } from '../../lib/constants';

export function StepSleep() {
  const { form, updateForm } = useContext(CheckinContext);

  const adjustHours = (delta: number) => {
    const next = Math.max(0, Math.min(24, form.sleep_hours + delta));
    updateForm({ sleep_hours: next });
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Sleep Duration</Text>
      <View style={styles.hourControl}>
        <TouchableOpacity
          style={styles.hourBtn}
          onPress={() => adjustHours(-0.5)}
        >
          <Text style={styles.hourBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.hourValue}>{form.sleep_hours}h</Text>
        <TouchableOpacity
          style={styles.hourBtn}
          onPress={() => adjustHours(0.5)}
        >
          <Text style={styles.hourBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Sleep Quality</Text>
      <View style={styles.qualityRow}>
        {[1, 2, 3, 4, 5].map((q) => {
          const isSelected = form.sleep_quality === q;
          const qColor =
            q <= 2 ? colors.red : q <= 3 ? colors.yellow : colors.green;

          return (
            <TouchableOpacity
              key={q}
              style={[
                styles.qualityBtn,
                isSelected && { borderColor: qColor, backgroundColor: `${qColor}20` },
              ]}
              onPress={() => updateForm({ sleep_quality: q })}
            >
              <Text
                style={[
                  styles.qualityNum,
                  isSelected && { color: qColor },
                ]}
              >
                {q}
              </Text>
              <Text
                style={[
                  styles.qualityLabel,
                  isSelected && { color: qColor },
                ]}
              >
                {SLEEP_QUALITY_LABELS[q]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  hourControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  hourBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourBtnText: {
    fontSize: fontSize.xxl,
    color: colors.accent,
    fontWeight: '300',
  },
  hourValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 100,
    textAlign: 'center',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  qualityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  qualityNum: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  qualityLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
