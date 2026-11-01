import React, { useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useFoodLog } from '../hooks/useFoodLog';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Eyebrow, DisplayText } from '../components/ui/SectionCard';
import { OverviewCard } from '../components/dashboard/OverviewCard';
import { StreakCard } from '../components/dashboard/StreakCard';
import { TargetsCard } from '../components/dashboard/TargetsCard';
import { TrendChart } from '../components/dashboard/TrendChart';
import { HistoryList } from '../components/dashboard/HistoryList';
import { BodyScanTracker } from '../components/dashboard/BodyScanTracker';
import { MetabolicMap } from '../components/dashboard/MetabolicMap';
import { VitalStatsCard } from '../components/dashboard/VitalStatsCard';
import { DailyScoreCard } from '../components/dashboard/DailyScoreCard';
import { AIInsightsCard } from '../components/dashboard/AIInsightsCard';
import { ProgressProjection } from '../components/dashboard/ProgressProjection';
import { ActiveChallengesCard } from '../components/challenges/ActiveChallengesCard';
import { colors, fontSize, spacing } from '../lib/theme';
import { PhotoCompare } from '../components/progress/PhotoCompare';
import { SectionCard } from '../components/ui/SectionCard';
import { getCheckins, HubCheckin } from '../lib/hub';

/**
 * Progress — everything the old dashboard showed, moved off the home screen
 * so Today stays clean. Nothing was removed.
 */
export default function ProgressScreen() {
  const { client, metrics, recentCheckins, streak, loading, refreshClientData } = useAuth();
  const { totals: foodLogTotals, hasEntries: hasFoodLog } = useFoodLog();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [checkins, setCheckins] = React.useState<HubCheckin[]>([]);
  React.useEffect(() => {
    getCheckins().then(setCheckins).catch(() => setCheckins([]));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    getCheckins().then(setCheckins).catch(() => undefined);
    setRefreshing(false);
  }, [refreshClientData]);

  if (loading) return <Loading />;
  if (!client) return <Loading />;

  const latestCheckin = recentCheckins[0] ?? null;

  const last7Temps = recentCheckins
    .slice(0, 7)
    .map((c) => c.body_temp)
    .filter((t): t is number => t != null);
  const avgTemp =
    last7Temps.length > 0 ? (last7Temps.reduce((a, b) => a + b, 0) / last7Temps.length).toFixed(1) : null;
  const tempWarning = avgTemp && parseFloat(avgTemp) <= 97.4;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={{ gap: 6 }}>
        <Eyebrow>Every change has a story</Eyebrow>
        <DisplayText size={34}>Your progress.</DisplayText>
      </View>

      <PhotoCompare checkins={checkins} />

      {checkins.find((c) => c.feedback) ? (
        <SectionCard
          eyebrow="From your coach"
          title={`Feedback · ${new Date(checkins.find((c) => c.feedback)!.feedback_at || checkins.find((c) => c.feedback)!.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          highlight
        >
          <Text style={{ color: colors.textPrimary, fontSize: fontSize.sm + 1, lineHeight: 21 }}>{checkins.find((c) => c.feedback)!.feedback}</Text>
        </SectionCard>
      ) : null}

      <TouchableOpacity onPress={() => router.push('/weekly-checkin')} accessibilityRole="button">
        <SectionCard eyebrow="Weekly check-in" title="New check-in" subtitle="Weight, how the week went, and three photos." right={<Ionicons name="camera-outline" size={22} color={colors.accentText} />} />
      </TouchableOpacity>

      <OverviewCard client={client} latestCheckin={latestCheckin} />

      {recentCheckins.length >= 2 && (
        <TrendChart checkins={recentCheckins} dataKey="weight_lbs" title="Weight Trend" unit=" lbs" />
      )}

      <StreakCard streak={streak} />
      <DailyScoreCard clientId={client.id} />
      <TargetsCard client={client} latestCheckin={latestCheckin} foodLogTotals={hasFoodLog ? foodLogTotals : null} />
      <ActiveChallengesCard />
      <VitalStatsCard client={client} metrics={metrics} latestCheckin={latestCheckin} />
      <AIInsightsCard clientId={client.id} />
      <ProgressProjection clientId={client.id} />

      {recentCheckins.length >= 2 && (
        <>
          <TrendChart checkins={recentCheckins} dataKey="calories" title="Calories" unit=" kcal" color={colors.gold} />
          <TrendChart checkins={recentCheckins} dataKey="steps" title="Steps" color={colors.green} />
          <TrendChart checkins={recentCheckins} dataKey="body_temp" title="Body Temp" unit="°F" color={colors.red} />
        </>
      )}

      {avgTemp && (
        <Card style={tempWarning ? styles.tempCardWarning : undefined}>
          <View style={styles.tempRow}>
            <View>
              <Text style={styles.tempLabel}>7-Day Avg Body Temp</Text>
              <Text style={[styles.tempValue, tempWarning && { color: colors.red }]}>{avgTemp}°F</Text>
            </View>
            {tempWarning && <Text style={styles.tempAlert}>Possible metabolic slowdown</Text>}
          </View>
        </Card>
      )}

      <MetabolicMap clientId={client.id} />
      <BodyScanTracker clientId={client.id} />
      <HistoryList checkins={recentCheckins} />

      <View style={{ height: spacing.xxxl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  topBar: { flexDirection: 'row' },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempCardWarning: { borderWidth: 1, borderColor: colors.red },
  tempRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tempLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  tempValue: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  tempAlert: { fontSize: fontSize.xs, color: colors.red, fontWeight: '600', maxWidth: 120, textAlign: 'right' },
});
