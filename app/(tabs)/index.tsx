import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { OverviewCard } from '../../components/dashboard/OverviewCard';
import { StreakCard } from '../../components/dashboard/StreakCard';
import { TargetsCard } from '../../components/dashboard/TargetsCard';
import { TrendChart } from '../../components/dashboard/TrendChart';
import { HistoryList } from '../../components/dashboard/HistoryList';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function DashboardScreen() {
  const { client, metrics, recentCheckins, streak, loading, clientError, refreshClientData } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  if (loading) return <Loading />;

  if (!client) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top + spacing.xxxl }]}>
        <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
        <Text style={styles.errorText}>
          {clientError || 'Could not connect to the server.'}
        </Text>
        <Button title="Retry" onPress={refreshClientData} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const latestCheckin = recentCheckins[0] ?? null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <OverviewCard client={client} latestCheckin={latestCheckin} />

      <StreakCard streak={streak} />

      <TargetsCard client={client} latestCheckin={latestCheckin} />

      {recentCheckins.length >= 2 && (
        <>
          <TrendChart
            checkins={recentCheckins}
            dataKey="weight_lbs"
            title="Weight Trend"
            unit=" lbs"
          />
          <TrendChart
            checkins={recentCheckins}
            dataKey="calories"
            title="Calories"
            unit=" kcal"
            color={colors.gold}
          />
          <TrendChart
            checkins={recentCheckins}
            dataKey="steps"
            title="Steps"
            color={colors.green}
          />
        </>
      )}

      <HistoryList checkins={recentCheckins} />

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: spacing.xxl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
