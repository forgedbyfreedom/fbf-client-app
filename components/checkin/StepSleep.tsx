import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { Input } from '../ui/Input';
import { HealthKitImportButton } from './HealthKitImportButton';
import { useHealthKit } from '../../hooks/useHealthKit';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { SLEEP_QUALITY_LABELS } from '../../lib/constants';

export function StepSleep() {
  const { form, updateForm } = useContext(CheckinContext);
  const { available, authorized, requestPermission, getTodaySleep } = useHealthKit();

  const handleHealthImport = async () => {
    await requestPermission();
    const sleep = await getTodaySleep();
    const updates: Record<string, any> = {};
    if (sleep.hours > 0) updates.sleep_hours = sleep.hours;
    if (sleep.quality > 0) updates.sleep_quality = sleep.quality;
    if (Object.keys(updates).length > 0) updateForm(updates);
  };

  const adjustHours = (delta: number) => {
    const next = Math.max(0, Math.min(24, form.sleep_hours + delta));
    updateForm({ sleep_hours: next });
  };

  return (
    <View>
      <HealthKitImportButton
        onImport={handleHealthImport}
        label="Import sleep from Apple Health"
        dataTypes="sleep duration, sleep stages"
        available={available}
        authorized={authorized}
        onRequestPermission={requestPermission}
      />

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

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Input
            label="Bedtime"
            value={form.sleep_time}
            onChangeText={(t) => updateForm({ sleep_time: t })}
            placeholder="e.g. 10:30 PM"
          />
        </View>
        <View style={styles.timeField}>
          <Input
            label="Wake Time"
            value={form.wake_time}
            onChangeText={(t) => updateForm({ wake_time: t })}
            placeholder="e.g. 6:00 AM"
          />
        </View>
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
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  timeField: {
    flex: 1,
  },
});
