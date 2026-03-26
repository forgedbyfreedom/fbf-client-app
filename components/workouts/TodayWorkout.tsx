import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutDay, ExerciseLog, PersonalRecord } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ExerciseLogCard } from './ExerciseLogCard';
import { WorkoutTimer } from './WorkoutTimer';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { formatDayName, calculateTotalVolume, formatVolume } from '../../lib/workout-utils';

interface TodayWorkoutProps {
  todayWorkout: WorkoutDay | null;
  allDays: WorkoutDay[];
  exercises: ExerciseLog[];
  isWorkoutActive: boolean;
  elapsedSeconds: number;
  onStartWorkout: (day: WorkoutDay) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'weight_lbs' | 'actual_reps', value: string) => void;
  onToggleComplete: (exerciseIndex: number, setIndex: number) => void;
  onFinishWorkout: (notes?: string) => Promise<{ log: any; newPRs: PersonalRecord[] }>;
  onCancelWorkout: () => void;
  onRenameExercise?: (exerciseIndex: number, newName: string) => void;
  onRemoveExercise?: (exerciseIndex: number) => void;
  onAddExercise?: (name: string, numSets: number, targetReps: string) => void;
  onAddSet?: (exerciseIndex: number) => void;
  onRemoveSet?: (exerciseIndex: number, setIndex: number) => void;
}

export function TodayWorkout({
  todayWorkout,
  allDays,
  exercises,
  isWorkoutActive,
  elapsedSeconds,
  onStartWorkout,
  onUpdateSet,
  onToggleComplete,
  onFinishWorkout,
  onCancelWorkout,
  onRenameExercise,
  onRemoveExercise,
  onAddExercise,
  onAddSet,
  onRemoveSet,
}: TodayWorkoutProps) {
  const [finishing, setFinishing] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [addExerciseVisible, setAddExerciseVisible] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('10');

  // Active workout view
  if (isWorkoutActive && exercises.length > 0) {
    const completedSets = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const currentVolume = calculateTotalVolume(exercises);
    const progress = totalSets > 0 ? completedSets / totalSets : 0;

    return (
      <View style={styles.container}>
        <WorkoutTimer elapsedSeconds={elapsedSeconds} isActive={isWorkoutActive} />

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedSets}/{totalSets} sets completed
          </Text>
        </View>

        {/* Volume tracker */}
        <Card style={styles.volumeCard}>
          <View style={styles.volumeRow}>
            <View style={styles.volumeItem}>
              <Ionicons name="flame-outline" size={16} color={colors.accent} />
              <Text style={styles.volumeLabel}>Volume</Text>
              <Text style={styles.volumeValue}>{formatVolume(currentVolume)} lbs</Text>
            </View>
            <View style={styles.volumeItem}>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.green} />
              <Text style={styles.volumeLabel}>Progress</Text>
              <Text style={styles.volumeValue}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
        </Card>

        {/* Exercise cards */}
        {exercises.map((exercise, i) => (
          <ExerciseLogCard
            key={`${i}-${exercise.exercise_name}`}
            exercise={exercise}
            exerciseIndex={i}
            onUpdateSet={onUpdateSet}
            onToggleComplete={onToggleComplete}
            onRenameExercise={onRenameExercise}
            onRemoveExercise={onRemoveExercise}
            onAddSet={onAddSet}
            onRemoveSet={onRemoveSet}
          />
        ))}

        {/* Add Exercise */}
        {onAddExercise && (
          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => setAddExerciseVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
        )}

        {/* Add Exercise Modal */}
        <Modal
          visible={addExerciseVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddExerciseVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <Text style={styles.modalLabel}>Exercise Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newExName}
                onChangeText={setNewExName}
                placeholder="e.g. Lat Pulldown"
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              <View style={styles.modalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Sets</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newExSets}
                    onChangeText={setNewExSets}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Target Reps</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newExReps}
                    onChangeText={setNewExReps}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setAddExerciseVisible(false);
                    setNewExName('');
                    setNewExSets('3');
                    setNewExReps('10');
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Add"
                  onPress={() => {
                    if (!newExName.trim()) return;
                    onAddExercise!(newExName.trim(), parseInt(newExSets, 10) || 3, newExReps || '10');
                    setAddExerciseVisible(false);
                    setNewExName('');
                    setNewExSets('3');
                    setNewExReps('10');
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Notes input */}
        <Card>
          <Text style={styles.notesLabel}>Workout Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={workoutNotes}
            onChangeText={setWorkoutNotes}
            placeholder="How did it go? Any adjustments?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Finish / Cancel buttons */}
        <View style={styles.actionRow}>
          <Button
            title="Finish Workout"
            onPress={async () => {
              if (completedSets === 0) {
                Alert.alert(
                  'No Sets Completed',
                  'Complete at least one set before finishing.',
                );
                return;
              }
              setFinishing(true);
              try {
                await onFinishWorkout(workoutNotes || undefined);
                setWorkoutNotes('');
              } finally {
                setFinishing(false);
              }
            }}
            loading={finishing}
            style={{ flex: 1 }}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => {
              Alert.alert(
                'Cancel Workout',
                'Are you sure? Your progress will be lost.',
                [
                  { text: 'Keep Going', style: 'cancel' },
                  { text: 'Cancel Workout', style: 'destructive', onPress: onCancelWorkout },
                ]
              );
            }}
            style={{ flex: 0.4 }}
          />
        </View>
      </View>
    );
  }

  // Rest day / no workout scheduled
  if (!todayWorkout && allDays.length > 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.restCard}>
          <View style={styles.restContent}>
            <Ionicons name="bed-outline" size={48} color={colors.accent} />
            <Text style={styles.restTitle}>Rest Day</Text>
            <Text style={styles.restSubtitle}>
              No workout scheduled for today. Recovery is part of the process.
            </Text>
          </View>
        </Card>

        <Text style={styles.altTitle}>Start a Different Workout</Text>
        {allDays
          .filter((d) => {
            const name = (d.day || d.name || '').toLowerCase();
            // Filter out BJJ-only days and weekend-labeled optional days
            return !name.includes('bjj') || name.includes('upper') || name.includes('lower') || name.includes('push') || name.includes('pull');
          })
          .map((day, i) => (
          <Card key={i} style={styles.dayCard}>
            <View style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{formatDayName(day)}</Text>
                <Text style={styles.dayExercises}>
                  {day.exercises.length} exercises
                  {day.dayOfWeek ? ` - ${day.dayOfWeek}` : ''}
                </Text>
              </View>
              <Button
                title="Start"
                variant="secondary"
                onPress={() => onStartWorkout(day)}
                style={styles.startBtn}
              />
            </View>
          </Card>
        ))}
      </View>
    );
  }

  // No program assigned
  if (allDays.length === 0) {
    return (
      <Card style={styles.noProgramCard}>
        <View style={styles.noProgramContent}>
          <Ionicons name="barbell-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.noProgramTitle}>No Workout Program</Text>
          <Text style={styles.noProgramSubtitle}>
            Your coach hasn't assigned a workout program yet. Contact your coach to get started.
          </Text>
        </View>
      </Card>
    );
  }

  // Today's workout preview (not started)
  return (
    <View style={styles.container}>
      <Card style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <View>
            <Text style={styles.todayLabel}>TODAY'S WORKOUT</Text>
            <Text style={styles.todayName}>{formatDayName(todayWorkout!)}</Text>
          </View>
          <Text style={styles.todayExCount}>
            {todayWorkout!.exercises.length} exercises
          </Text>
        </View>

        {todayWorkout!.exercises.map((ex, i) => (
          <View key={i} style={styles.exercisePreview}>
            <Text style={styles.exercisePreviewName}>{ex.name}</Text>
            <Text style={styles.exercisePreviewSets}>
              {ex.sets} x {ex.reps}
              {ex.rest ? ` | ${ex.rest} rest` : ''}
            </Text>
            {ex.notes ? (
              <Text style={styles.exercisePreviewNote}>{ex.notes}</Text>
            ) : null}
          </View>
        ))}

        <Button
          title="Start Workout"
          onPress={() => onStartWorkout(todayWorkout!)}
          style={styles.startWorkoutBtn}
        />
      </Card>

      {/* Other days */}
      {allDays.length > 1 && (
        <>
          <Text style={styles.altTitle}>Other Workouts</Text>
          {allDays
            .filter((d) => {
              if (d === todayWorkout) return false;
              const name = (d.day || d.name || '').toLowerCase();
              // Filter out BJJ-only days — BJJ is handled by the dedicated BJJ Logger
              return !name.includes('bjj') || name.includes('upper') || name.includes('lower') || name.includes('push') || name.includes('pull');
            })
            .map((day, i) => (
              <Card key={i} style={styles.dayCard}>
                <View style={styles.dayRow}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayName}>{formatDayName(day)}</Text>
                    <Text style={styles.dayExercises}>
                      {day.exercises.length} exercises
                      {day.dayOfWeek ? ` - ${day.dayOfWeek}` : ''}
                    </Text>
                  </View>
                  <Button
                    title="Start"
                    variant="secondary"
                    onPress={() => onStartWorkout(day)}
                    style={styles.startBtn}
                  />
                </View>
              </Card>
            ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  volumeCard: {
    marginBottom: spacing.sm,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  volumeItem: {
    alignItems: 'center',
    gap: 2,
  },
  volumeLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  volumeValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Rest day styles
  restCard: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  restContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  restTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  restSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // No program styles
  noProgramCard: {},
  noProgramContent: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  noProgramTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noProgramSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  // Today card styles
  todayCard: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  todayName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayExCount: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  exercisePreview: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exercisePreviewName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exercisePreviewSets: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exercisePreviewNote: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  startWorkoutBtn: {
    marginTop: spacing.lg,
  },
  // Alt workouts
  altTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  dayCard: {},
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  dayName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayExercises: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  startBtn: {
    paddingHorizontal: spacing.lg,
    minHeight: 36,
    paddingVertical: spacing.sm,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentMuted,
  },
  addExerciseText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
