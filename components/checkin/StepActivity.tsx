import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { MoodSelector } from './MoodSelector';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { TRAINING_TYPES } from '../../lib/constants';

export function StepActivity() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();

  const toggleTrainingType = (type: string) => {
    const current = form.training_type;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateForm({ training_type: updated });
  };

  return (
    <View>
      <Input
        label={`Steps${client?.target_steps ? ` (target: ${client.target_steps.toLocaleString()})` : ''}`}
        value={form.steps}
        onChangeText={(t) => updateForm({ steps: t })}
        placeholder="e.g. 10000"
        keyboardType="numeric"
        containerStyle={styles.field}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Training Done</Text>
        <Switch
          value={form.training_done}
          onValueChange={(v) => updateForm({ training_done: v })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      {form.training_done && (
        <>
          <Text style={styles.sublabel}>Muscle Groups</Text>
          <View style={styles.chipRow}>
            {TRAINING_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  form.training_type.includes(type) && styles.chipSelected,
                ]}
                onPress={() => toggleTrainingType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.training_type.includes(type) && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Workout Description"
            value={form.workout_description}
            onChangeText={(t) => updateForm({ workout_description: t })}
            placeholder="Describe your workout..."
            multiline
            numberOfLines={3}
            containerStyle={styles.field}
            style={styles.multiline}
          />

          <MoodSelector
            value={parseInt(form.rpe) || 5}
            onChange={(v) => updateForm({ rpe: String(v) })}
            label="Rate of Perceived Exertion (RPE)"
            max={10}
          />

          <MoodSelector
            value={parseInt(form.performance_rating) || 5}
            onChange={(v) => updateForm({ performance_rating: String(v) })}
            label="Rate Your Performance Today"
            max={10}
          />

          <Input
            label="Workout Notes"
            value={form.workout_notes}
            onChangeText={(t) => updateForm({ workout_notes: t })}
            placeholder="PRs, how you felt, etc."
            multiline
            numberOfLines={2}
            containerStyle={styles.field}
            style={styles.multiline}
          />
        </>
      )}

      <Input
        label="Cardio Minutes"
        value={form.cardio_minutes}
        onChangeText={(t) => updateForm({ cardio_minutes: t })}
        placeholder="e.g. 30"
        keyboardType="numeric"
        containerStyle={styles.field}
      />

      {/* BJJ Section */}
      <View style={styles.switchRow}>
        <Text style={styles.label}>BJJ Training</Text>
        <Switch
          value={form.bjj_done}
          onValueChange={(v) => updateForm({ bjj_done: v })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      {form.bjj_done && (
        <>
          <View style={styles.chipRow}>
            {['gi', 'no-gi', 'both'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  form.bjj_type === type && styles.chipSelected,
                ]}
                onPress={() => updateForm({ bjj_type: type })}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.bjj_type === type && styles.chipTextSelected,
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Rounds"
                value={form.bjj_rounds}
                onChangeText={(t) => updateForm({ bjj_rounds: t })}
                keyboardType="numeric"
                placeholder="e.g. 5"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="Round Length (min)"
                value={form.bjj_round_min}
                onChangeText={(t) => updateForm({ bjj_round_min: t })}
                keyboardType="numeric"
                placeholder="e.g. 5"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Rest Between (min)"
                value={form.bjj_rest_min}
                onChangeText={(t) => updateForm({ bjj_rest_min: t })}
                keyboardType="numeric"
                placeholder="e.g. 1"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="Drill Time (min)"
                value={form.bjj_drill_min}
                onChangeText={(t) => updateForm({ bjj_drill_min: t })}
                keyboardType="numeric"
                placeholder="e.g. 30"
              />
            </View>
          </View>

          <Text style={styles.sublabel}>Intensity</Text>
          <View style={styles.chipRow}>
            {['light', 'moderate', 'hard'].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.chip,
                  form.bjj_intensity === level && styles.chipSelected,
                ]}
                onPress={() => updateForm({ bjj_intensity: level })}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.bjj_intensity === level && styles.chipTextSelected,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Input
        label="Estimated Calories Burned"
        value={form.estimated_calories_burned}
        onChangeText={(t) => updateForm({ estimated_calories_burned: t })}
        placeholder="Auto-estimated if left blank"
        keyboardType="numeric"
        containerStyle={styles.field}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  chipTextSelected: {
    color: colors.accent,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfField: {
    flex: 1,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
