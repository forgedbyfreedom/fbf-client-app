import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useWorkoutLog } from '../../hooks/useWorkoutLog';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { Card } from '../../components/ui/Card';
import { TodayWorkout } from '../../components/workouts/TodayWorkout';
import { PRTracker } from '../../components/workouts/PRTracker';
import { WorkoutHistory } from '../../components/workouts/WorkoutHistory';
import { PRAlert } from '../../components/workouts/PRAlert';
import { Loading } from '../../components/ui/Loading';
import { WorkoutDay } from '../../types';
import { getTodaysWorkout } from '../../lib/workout-utils';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

type TabView = 'workout' | 'prs' | 'history';

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const { client, loading: authLoading, refreshClientData } = useAuth();
  const {
    exercises,
    isWorkoutActive,
    elapsedSeconds,
    startWorkout,
    updateSet,
    toggleSetComplete,
    finishWorkout,
    cancelWorkout,
    workoutLogs,
    personalRecords,
    prHistory,
    loadHistory,
    latestPRAlerts,
    clearPRAlerts,
    loading: workoutLoading,
  } = useWorkoutLog();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('workout');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshClientData(), loadHistory()]);
    setRefreshing(false);
  }, [refreshClientData, loadHistory]);

  if (authLoading) return <Loading />;

  const workoutProgram: WorkoutDay[] =
    client?.workout_program && Array.isArray(client.workout_program) && client.workout_program.length > 0
      ? (client.workout_program as WorkoutDay[])
      : [];

  const todayWorkout = getTodaysWorkout(workoutProgram.length > 0 ? workoutProgram : null);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxxl * 2 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader title="Workouts" />

        {/* Tab Toggle — only show when not in active workout */}
        {!isWorkoutActive && (
          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'workout' && styles.tabActive]}
              onPress={() => setActiveTab('workout')}
            >
              <Ionicons
                name="barbell-outline"
                size={16}
                color={activeTab === 'workout' ? colors.accent : colors.textTertiary}
              />
              <Text style={[styles.tabText, activeTab === 'workout' && styles.tabTextActive]}>
                Workout
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'prs' && styles.tabActive]}
              onPress={() => setActiveTab('prs')}
            >
              <Ionicons
                name="trophy-outline"
                size={16}
                color={activeTab === 'prs' ? colors.accent : colors.textTertiary}
              />
              <Text style={[styles.tabText, activeTab === 'prs' && styles.tabTextActive]}>
                PRs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={activeTab === 'history' ? colors.accent : colors.textTertiary}
              />
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                History
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content based on active tab or workout state */}
        {isWorkoutActive || activeTab === 'workout' ? (
          <TodayWorkout
            todayWorkout={todayWorkout}
            allDays={workoutProgram}
            exercises={exercises}
            isWorkoutActive={isWorkoutActive}
            elapsedSeconds={elapsedSeconds}
            onStartWorkout={startWorkout}
            onUpdateSet={updateSet}
            onToggleComplete={toggleSetComplete}
            onFinishWorkout={finishWorkout}
            onCancelWorkout={cancelWorkout}
          />
        ) : activeTab === 'prs' ? (
          <PRTracker personalRecords={personalRecords} prHistory={prHistory} />
        ) : (
          <WorkoutHistory logs={workoutLogs} />
        )}

        {/* Quick stats when not in active workout */}
        {!isWorkoutActive && activeTab === 'workout' && workoutLogs.length > 0 && (
          <Card style={styles.quickStats}>
            <Text style={styles.quickStatsTitle}>This Week</Text>
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {getThisWeekWorkouts(workoutLogs)}
                </Text>
                <Text style={styles.quickStatLabel}>Workouts</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {getThisWeekVolume(workoutLogs)}
                </Text>
                <Text style={styles.quickStatLabel}>Total Volume</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {getThisWeekPRs(workoutLogs)}
                </Text>
                <Text style={styles.quickStatLabel}>PRs Hit</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* PR Alert overlay */}
      {latestPRAlerts.length > 0 && (
        <PRAlert prs={latestPRAlerts} onDismiss={clearPRAlerts} />
      )}
    </View>
  );
}

// Helper functions for weekly stats
function getThisWeekWorkouts(logs: any[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return logs.filter((l) => new Date(l.date) >= startOfWeek).length;
}

function getThisWeekVolume(logs: any[]): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const total = logs
    .filter((l: any) => new Date(l.date) >= startOfWeek)
    .reduce((acc: number, l: any) => acc + (l.total_volume_lbs || 0), 0);
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return String(total);
}

function getThisWeekPRs(logs: any[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return logs
    .filter((l: any) => new Date(l.date) >= startOfWeek)
    .reduce((acc: number, l: any) => acc + (l.prs_hit?.length || 0), 0);
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.accentMuted,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  quickStats: {
    marginTop: spacing.lg,
  },
  quickStatsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  quickStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.accent,
  },
  quickStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
