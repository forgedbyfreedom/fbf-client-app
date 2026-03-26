import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExerciseLog } from '../../types';
import { Card } from '../ui/Card';
import { SetRow } from './SetRow';
import { colors, fontSize, spacing } from '../../lib/theme';
import { getPRCategory } from '../../lib/workout-utils';

interface ExerciseLogCardProps {
  exercise: ExerciseLog;
  exerciseIndex: number;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight_lbs' | 'actual_reps', value: string) => void;
  onToggleComplete: (exerciseIndex: number, setIndex: number) => void;
}

export function ExerciseLogCard({ exercise, exerciseIndex, onUpdateSet, onToggleComplete }: ExerciseLogCardProps) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const allComplete = completedSets === totalSets;
  const prCategory = getPRCategory(exercise.exercise_name);

  return (
    <Card style={allComplete ? { ...styles.card, ...styles.cardComplete } : styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
          {prCategory && (
            <View style={styles.prTrackBadge}>
              <Text style={styles.prTrackText}>PR TRACK</Text>
            </View>
          )}
        </View>
        <Text style={styles.progress}>
          {completedSets}/{totalSets} sets
        </Text>
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
        />
      ))}
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
  progress: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: '600',
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
});
