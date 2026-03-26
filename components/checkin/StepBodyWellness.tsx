import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { MoodSelector } from './MoodSelector';
import { HealthKitImportButton } from './HealthKitImportButton';
import { useHealthKit } from '../../hooks/useHealthKit';
import { colors, fontSize, spacing } from '../../lib/theme';
import { DAYS_OF_WEEK } from '../../lib/constants';

export function StepBodyWellness() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();
  const { available, authorized, requestPermission, getTodayBodyTemp, getTodayHeartRate } = useHealthKit();

  const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const isWeighInDay = client?.weigh_in_day?.toLowerCase() === today;

  const handleHealthImport = async () => {
    await requestPermission();
    const [bodyTemp, heartRate] = await Promise.all([
      getTodayBodyTemp(),
      getTodayHeartRate(),
    ]);
    const updates: Record<string, any> = {};
    if (bodyTemp > 0) updates.body_temp = String(bodyTemp);
    if (heartRate.resting > 0) updates.resting_heart_rate = String(heartRate.resting);
    if (Object.keys(updates).length > 0) updateForm(updates);
  };

  return (
    <View>
      <HealthKitImportButton
        onImport={handleHealthImport}
        label="Auto-fill from Apple Health"
        dataTypes="body temperature, resting heart rate"
        available={available}
        authorized={authorized}
        onRequestPermission={requestPermission}
      />
      {isWeighInDay ? (
        <Input
          label="Weight (lbs)"
          value={form.weight_lbs}
          onChangeText={(t) => updateForm({ weight_lbs: t })}
          placeholder="e.g. 185.5"
          keyboardType="decimal-pad"
          containerStyle={styles.field}
        />
      ) : (
        <View style={styles.weighInNote}>
          <Text style={styles.noteText}>
            Weigh-in day is {client?.weigh_in_day ?? 'Monday'}. You can still log weight if you'd like.
          </Text>
          <Input
            label="Weight (lbs) - Optional"
            value={form.weight_lbs}
            onChangeText={(t) => updateForm({ weight_lbs: t })}
            placeholder="e.g. 185.5"
            keyboardType="decimal-pad"
            containerStyle={styles.field}
          />
        </View>
      )}

      <Input
        label="Body Temperature (°F)"
        value={form.body_temp}
        onChangeText={(t) => updateForm({ body_temp: t })}
        placeholder="e.g. 98.6"
        keyboardType="decimal-pad"
        containerStyle={styles.field}
      />

      <Input
        label="Blood Glucose (mg/dL)"
        value={form.blood_glucose}
        onChangeText={(t) => updateForm({ blood_glucose: t })}
        placeholder="e.g. 95"
        keyboardType="numeric"
        containerStyle={styles.field}
      />

      <Input
        label="Resting Heart Rate (bpm)"
        value={form.resting_heart_rate}
        onChangeText={(t) => updateForm({ resting_heart_rate: t })}
        placeholder="e.g. 65"
        keyboardType="numeric"
        containerStyle={styles.field}
      />

      <View style={styles.bpRow}>
        <View style={styles.bpField}>
          <Input
            label="Blood Pressure (sys)"
            value={form.blood_pressure_systolic}
            onChangeText={(t) => updateForm({ blood_pressure_systolic: t })}
            placeholder="e.g. 120"
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.bpSlash}>/</Text>
        <View style={styles.bpField}>
          <Input
            label="(dia)"
            value={form.blood_pressure_diastolic}
            onChangeText={(t) => updateForm({ blood_pressure_diastolic: t })}
            placeholder="e.g. 80"
            keyboardType="numeric"
          />
        </View>
      </View>

      <MoodSelector
        value={form.mood_rating}
        onChange={(v) => updateForm({ mood_rating: v })}
        label="Mood"
        max={10}
      />

      <Input
        label="Mood Notes (optional)"
        value={form.mood_notes}
        onChangeText={(t) => updateForm({ mood_notes: t })}
        placeholder="How are you feeling today?"
        multiline
        numberOfLines={2}
        containerStyle={styles.field}
        style={styles.multiline}
      />

      <MoodSelector
        value={form.stress_level}
        onChange={(v) => updateForm({ stress_level: v })}
        label="Stress Level"
        max={10}
        inverted
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  weighInNote: {},
  bpRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 8,
    marginBottom: spacing.lg,
  },
  bpField: {
    flex: 1,
  },
  bpSlash: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    paddingBottom: 12,
  },
  noteText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
