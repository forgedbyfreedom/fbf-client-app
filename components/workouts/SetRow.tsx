import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSet } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface SetRowProps {
  set: WorkoutSet;
  exerciseIndex: number;
  setIndex: number;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight_lbs' | 'actual_reps', value: string) => void;
  onToggleComplete: (exerciseIndex: number, setIndex: number) => void;
}

export function SetRow({ set, exerciseIndex, setIndex, onUpdateSet, onToggleComplete }: SetRowProps) {
  const isComplete = set.completed;

  return (
    <View style={[styles.row, isComplete && styles.rowComplete]}>
      <View style={styles.setNumberContainer}>
        <Text style={[styles.setNumber, isComplete && styles.textComplete]}>
          {set.set_number}
        </Text>
      </View>

      <View style={styles.targetContainer}>
        <Text style={[styles.targetReps, isComplete && styles.textComplete]}>
          {set.target_reps}
        </Text>
      </View>

      <TextInput
        style={[styles.input, isComplete && styles.inputComplete]}
        value={set.weight_lbs}
        onChangeText={(v) => onUpdateSet(exerciseIndex, setIndex, 'weight_lbs', v)}
        placeholder="lbs"
        placeholderTextColor={colors.textTertiary}
        keyboardType="numeric"
        editable={!isComplete}
      />

      <TextInput
        style={[styles.input, isComplete && styles.inputComplete]}
        value={set.actual_reps}
        onChangeText={(v) => onUpdateSet(exerciseIndex, setIndex, 'actual_reps', v)}
        placeholder="reps"
        placeholderTextColor={colors.textTertiary}
        keyboardType="numeric"
        editable={!isComplete}
      />

      <TouchableOpacity
        style={[styles.checkButton, isComplete && styles.checkButtonComplete]}
        onPress={() => onToggleComplete(exerciseIndex, setIndex)}
      >
        <Ionicons
          name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={isComplete ? colors.green : colors.textTertiary}
        />
      </TouchableOpacity>

      {set.is_pr && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowComplete: {
    opacity: 0.6,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  setNumberContainer: {
    width: 28,
    alignItems: 'center',
  },
  setNumber: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  targetContainer: {
    width: 48,
    alignItems: 'center',
  },
  targetReps: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  textComplete: {
    color: colors.textTertiary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    minHeight: 36,
  },
  inputComplete: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.textTertiary,
  },
  checkButton: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonComplete: {},
  prBadge: {
    position: 'absolute',
    right: -2,
    top: 2,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  prText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
});
