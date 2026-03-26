import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseLog } from '../../types';
import { Card } from '../ui/Card';
import { SetRow } from './SetRow';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { getPRCategory } from '../../lib/workout-utils';

interface ExerciseLogCardProps {
  exercise: ExerciseLog;
  exerciseIndex: number;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight_lbs' | 'actual_reps', value: string) => void;
  onToggleComplete: (exerciseIndex: number, setIndex: number) => void;
  onRenameExercise?: (exerciseIndex: number, newName: string) => void;
  onRemoveExercise?: (exerciseIndex: number) => void;
  onAddSet?: (exerciseIndex: number) => void;
  onRemoveSet?: (exerciseIndex: number, setIndex: number) => void;
}

export function ExerciseLogCard({
  exercise,
  exerciseIndex,
  onUpdateSet,
  onToggleComplete,
  onRenameExercise,
  onRemoveExercise,
  onAddSet,
  onRemoveSet,
}: ExerciseLogCardProps) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const allComplete = completedSets === totalSets && totalSets > 0;
  const prCategory = getPRCategory(exercise.exercise_name);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(exercise.exercise_name);

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== exercise.exercise_name) {
      onRenameExercise?.(exerciseIndex, editName.trim());
    }
    setIsEditing(false);
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Exercise',
      `Remove "${exercise.exercise_name}" from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveExercise?.(exerciseIndex) },
      ]
    );
  };

  return (
    <Card style={allComplete ? { ...styles.card, ...styles.cardComplete } : styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {isEditing ? (
            <TextInput
              style={styles.editNameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleRename}
              onSubmitEditing={handleRename}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              onLongPress={() => {
                if (onRenameExercise) {
                  setEditName(exercise.exercise_name);
                  setIsEditing(true);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
            </TouchableOpacity>
          )}
          {prCategory && (
            <View style={styles.prTrackBadge}>
              <Text style={styles.prTrackText}>PR TRACK</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.progress}>
            {completedSets}/{totalSets}
          </Text>
          {onRenameExercise && (
            <TouchableOpacity
              onPress={() => {
                setEditName(exercise.exercise_name);
                setIsEditing(true);
              }}
              style={styles.editBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.accent} />
            </TouchableOpacity>
          )}
          {onRemoveExercise && (
            <TouchableOpacity
              onPress={handleRemove}
              style={styles.editBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {exercise.exercise_note ? (
        <Text style={styles.note}>{exercise.exercise_note}</Text>
      ) : null}

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.colHeader, { width: 28 }]}>SET</Text>
        <Text style={[styles.colHeader, { width: 48 }]}>TARGET</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>LBS</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>REPS</Text>
        <Text style={[styles.colHeader, { width: 36 }]}></Text>
      </View>

      {exercise.sets.map((set, setIndex) => (
        <SetRow
          key={set.set_number}
          set={set}
          exerciseIndex={exerciseIndex}
          setIndex={setIndex}
          onUpdateSet={onUpdateSet}
          onToggleComplete={onToggleComplete}
          onRemoveSet={onRemoveSet}
        />
      ))}

      {/* Add/Remove set row */}
      {onAddSet && (
        <TouchableOpacity
          style={styles.addSetBtn}
          onPress={() => onAddSet(exerciseIndex)}
        >
          <Ionicons name="add" size={14} color={colors.accent} />
          <Text style={styles.addSetText}>Add Set</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  cardComplete: {
    borderColor: colors.green,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editNameInput: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 150,
  },
  prTrackBadge: {
    backgroundColor: colors.accentMuted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prTrackText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progress: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  editBtn: {
    padding: 2,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addSetText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
});
