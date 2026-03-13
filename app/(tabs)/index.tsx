import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { OverviewCard } from '../../components/dashboard/OverviewCard';
import { StreakCard } from '../../components/dashboard/StreakCard';
import { TargetsCard } from '../../components/dashboard/TargetsCard';
import { TrendChart } from '../../components/dashboard/TrendChart';
import { HistoryList } from '../../components/dashboard/HistoryList';
import { BodyScanTracker } from '../../components/dashboard/BodyScanTracker';
import { MetabolicMap } from '../../components/dashboard/MetabolicMap';
import { Card } from '../../components/ui/Card';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function DashboardScreen() {
  const { client, metrics, recentCheckins, streak, loading, clientError, refreshClientData, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  if (loading) return <Loading />;

  if (!client && isAdmin) {
    return <Redirect href="/(tabs)/admin" />;
  }

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

  // Calculate weekly body temp average
  const last7Temps = recentCheckins
    .slice(0, 7)
    .map((c) => c.body_temp)
    .filter((t): t is number => t != null);
  const avgTemp = last7Temps.length > 0
    ? (last7Temps.reduce((a, b) => a + b, 0) / last7Temps.length).toFixed(1)
    : null;
  const tempWarning = avgTemp && parseFloat(avgTemp) <= 97.4;

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
          <TrendChart
            checkins={recentCheckins}
            dataKey="body_temp"
            title="Body Temp"
            unit="°F"
            color={colors.red}
          />
        </>
      )}

      {avgTemp && (
        <Card style={tempWarning ? styles.tempCardWarning : undefined}>
          <View style={styles.tempRow}>
            <View>
              <Text style={styles.tempLabel}>7-Day Avg Body Temp</Text>
              <Text style={[styles.tempValue, tempWarning && { color: colors.red }]}>
                {avgTemp}°F
              </Text>
            </View>
            {tempWarning && (
              <Text style={styles.tempAlert}>Possible metabolic slowdown</Text>
            )}
          </View>
        </Card>
      )}

      <MetabolicMap clientId={client.id} />

      <BodyScanTracker clientId={client.id} />

      <HistoryList checkins={recentCheckins} />

      <TouchableOpacity
        style={styles.storeCard}
        onPress={() => Linking.openURL('https://www.etsy.com/shop/FBFStrengthNutrition')}
        activeOpacity={0.8}
      >
        <Text style={styles.storeTitle}>FBF Store</Text>
        <Text style={styles.storeSub}>Shop gear and supplements</Text>
      </TouchableOpacity>

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
  tempCardWarning: {
    borderWidth: 1,
    borderColor: colors.red,
  },
  tempRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tempLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tempValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  tempAlert: {
    fontSize: fontSize.xs,
    color: colors.red,
    fontWeight: '600',
    maxWidth: 120,
    textAlign: 'right',
  },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    alignItems: 'center',
  },
  storeTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
  },
  storeSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
