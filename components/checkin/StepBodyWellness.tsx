import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { MoodSelector } from './MoodSelector';
import { colors, fontSize, spacing } from '../../lib/theme';
import { DAYS_OF_WEEK } from '../../lib/constants';

export function StepBodyWellness() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();

  const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const isWeighInDay = client?.weigh_in_day?.toLowerCase() === today;

  return (
    <View>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  weighInNote: {},
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
