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
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useFoodLog } from '../../hooks/useFoodLog';
import { api } from '../../lib/api';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { OverviewCard } from '../../components/dashboard/OverviewCard';
import { StreakCard } from '../../components/dashboard/StreakCard';
import { TargetsCard } from '../../components/dashboard/TargetsCard';
import { TrendChart } from '../../components/dashboard/TrendChart';
import { HistoryList } from '../../components/dashboard/HistoryList';
import { BodyScanTracker } from '../../components/dashboard/BodyScanTracker';
import { MetabolicMap } from '../../components/dashboard/MetabolicMap';
import { VitalStatsCard } from '../../components/dashboard/VitalStatsCard';
import { Card } from '../../components/ui/Card';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { DailyScoreCard } from '../../components/dashboard/DailyScoreCard';
import { AIInsightsCard } from '../../components/dashboard/AIInsightsCard';
import { ProgressProjection } from '../../components/dashboard/ProgressProjection';
import { ActiveChallengesCard } from '../../components/challenges/ActiveChallengesCard';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useHealthKit } from '../../hooks/useHealthKit';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function DashboardScreen() {
  const { client, metrics, recentCheckins, streak, loading, clientError, refreshClientData, isAdmin } = useAuth();
  const { totals: foodLogTotals, hasEntries: hasFoodLog } = useFoodLog();
  const { available: hkAvailable, authorized: hkAuthorized, requestPermission: hkRequestPermission } = useHealthKit();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [settingUpCoach, setSettingUpCoach] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  if (loading) return <Loading />;

  const setupCoachProfile = async () => {
    setSettingUpCoach(true);
    try {
      await api.post('/api/client/setup-coach', {});
      await refreshClientData();
    } catch (err) {
      console.error('Coach setup error:', err);
    } finally {
      setSettingUpCoach(false);
    }
  };

  if (!client) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top + spacing.xxxl }]}>
        <BrandHeader />
        <Text style={[styles.errorTitle, { marginTop: spacing.xl }]}>
          {isAdmin ? 'Welcome, Coach' : 'Unable to Load Dashboard'}
        </Text>
        <Text style={styles.errorText}>
          {isAdmin
            ? 'Set up your personal profile to track your own training, nutrition, and check-ins alongside your clients.'
            : clientError || 'Could not connect to the server.'}
        </Text>
        {isAdmin ? (
          <>
            <Button
              title={settingUpCoach ? 'Setting up...' : 'Activate My Profile'}
              onPress={setupCoachProfile}
              loading={settingUpCoach}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              title="Go to Admin"
              variant="secondary"
              onPress={() => router.push('/(tabs)/admin')}
              style={{ marginTop: spacing.sm }}
            />
          </>
        ) : (
          <Button title="Retry" onPress={refreshClientData} style={{ marginTop: spacing.lg }} />
        )}
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
      <BrandHeader />
      <OverviewCard client={client} latestCheckin={latestCheckin} />

      <DailyScoreCard clientId={client.id} />

      <StreakCard streak={streak} />

      <ActiveChallengesCard />

      <TargetsCard client={client} latestCheckin={latestCheckin} foodLogTotals={hasFoodLog ? foodLogTotals : null} />

      {/* Apple Health Integration Card — always visible on iOS for 2.5.1 compliance */}
      {Platform.OS === 'ios' && (
        <Card style={styles.healthCard}>
          <View style={styles.healthCardHeader}>
            <View style={styles.healthCardIcon}>
              <Ionicons name="heart" size={22} color="#FF2D55" />
            </View>
            <View style={styles.healthCardInfo}>
              <Text style={styles.healthCardTitle}>Apple Health Integration</Text>
              <Text style={styles.healthCardStatus}>
                {!hkAvailable
                  ? 'Apple Health is not available on this device'
                  : hkAuthorized
                  ? 'Connected — health data auto-fills your daily check-ins'
                  : 'Tap to connect and auto-fill your daily check-ins'}
              </Text>
            </View>
          </View>
          <View style={styles.healthCardTypes}>
            {['Steps', 'Sleep', 'Heart Rate', 'Body Temp', 'Calories', 'Workouts', 'Weight'].map((type) => (
              <View key={type} style={styles.healthChip}>
                <Ionicons name="heart" size={8} color={hkAuthorized ? '#FF2D55' : colors.textTertiary} />
                <Text style={[styles.healthChipText, hkAuthorized && styles.healthChipTextActive]}>{type}</Text>
              </View>
            ))}
          </View>
          {hkAvailable && !hkAuthorized && (
            <TouchableOpacity
              style={styles.healthConnectBtn}
              onPress={async () => { await hkRequestPermission(); }}
            >
              <Text style={styles.healthConnectBtnText}>Connect Apple Health</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.healthPrivacy}>
            Your health data is never sold, shared, or used for advertising.
          </Text>
        </Card>
      )}

      <VitalStatsCard client={client} metrics={metrics} latestCheckin={latestCheckin} />

      <AIInsightsCard clientId={client.id} />

      <ProgressProjection clientId={client.id} />

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
        style={styles.promoCard}
        onPress={() => WebBrowser.openBrowserAsync('https://www.forgedbyfreedom.org/')}
        activeOpacity={0.8}
      >
        <Text style={styles.promoTag}>WORLD-CLASS COACHING</Text>
        <Text style={styles.promoTitle}>Forged by Freedom</Text>
        <Text style={styles.promoSub}>
          AI-powered coaching, custom meal plans, real-time check-ins, and the tools to transform your physique. Visit our platform.
        </Text>
        <Text style={styles.promoLink}>forgedbyfreedom.org</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.recompCard}
        onPress={() => WebBrowser.openBrowserAsync('https://www.forgedbyfreedom.org/fbf-recomp-protocol')}
        activeOpacity={0.8}
      >
        <Text style={styles.recompTag}>PROVEN RESULTS</Text>
        <Text style={styles.recompTitle}>FBF Recomp Protocol</Text>
        <Text style={styles.recompSub}>
          Our signature body recomposition system — lose fat and build muscle simultaneously. Backed by data from hundreds of clients with an average of 12 lbs fat loss and 6 lbs muscle gain in 90 days.
        </Text>
        <Text style={styles.promoLink}>Learn More</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.peptideCard}
        onPress={() => router.push('/peptides')}
        activeOpacity={0.8}
      >
        <Text style={styles.peptideTag}>PEPTIDE RESEARCH</Text>
        <Text style={styles.peptideTitle}>Explore Our Peptide Catalog</Text>
        <Text style={styles.peptideSub}>
          16 research-backed compounds for recomp, fat loss, longevity, cognitive enhancement, and more. Learn what each peptide does and book a consult for the full protocol.
        </Text>
        <Text style={styles.promoLink}>Browse Peptides</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.storeCard}
        onPress={() => Linking.openURL('https://www.etsy.com/shop/FBFStrengthNutrition')}
        activeOpacity={0.8}
      >
        <Text style={styles.storeTitle}>FBF Store</Text>
        <Text style={styles.storeSub}>Shop gear and supplements</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxxl * 3 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  healthCard: {
    borderColor: 'rgba(255, 45, 85, 0.3)',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  healthCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCardInfo: {
    flex: 1,
  },
  healthCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#FF2D55',
  },
  healthCardStatus: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  healthCardTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 45, 85, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  healthChipText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  healthChipTextActive: {
    color: '#FF2D55',
  },
  healthConnectBtn: {
    backgroundColor: '#FF2D55',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  healthConnectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  healthPrivacy: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
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
  promoCard: {
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: spacing.xl,
    alignItems: 'center',
  },
  promoTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  promoTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  promoSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  promoLink: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  recompCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.xl,
    alignItems: 'center',
  },
  recompTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  recompTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  recompSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  peptideCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#22c55e',
    padding: spacing.xl,
    alignItems: 'center' as const,
  },
  peptideTag: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#22c55e',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  peptideTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  peptideSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: spacing.md,
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
