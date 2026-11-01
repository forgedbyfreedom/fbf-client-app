import React, { useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { HydrationCard } from '../../components/today/HydrationCard';
import { AppleHealthCard } from '../../components/today/AppleHealthCard';
import { CoachUpdatesCard } from '../../components/dashboard/CoachUpdatesCard';
import { useDailySync } from '../../hooks/useDailySync';
import { postDailyLog } from '../../lib/hub';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { normalizeMealPlan } from '../../lib/normalize-plan';
import { getTodaysWorkout, getTodayDayOfWeek, formatDayName } from '../../lib/workout-utils';
import { colors, fontSize, spacing, fonts } from '../../lib/theme';

/**
 * Today — the redesigned home screen. One idea per card:
 * check-in CTA → coach → today's plan → water → progress → explore.
 * Everything the old dashboard showed lives on /progress.
 */
export default function TodayScreen() {
  const { client, recentCheckins, streak, loading, clientError, refreshClientData, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [settingUpCoach, setSettingUpCoach] = React.useState(false);
  const [skippedToday, setSkippedToday] = React.useState(false);
  useDailySync();

  const skipKey = `fbf_skip_${new Date().toDateString()}`;
  React.useEffect(() => {
    AsyncStorage.getItem(skipKey).then((v) => setSkippedToday(!!v)).catch(() => undefined);
  }, [skipKey]);

  const skipWorkout = () => {
    const go = async () => {
      await postDailyLog({ training_day: true, training_skipped: true, trained: false });
      await AsyncStorage.setItem(skipKey, '1');
      setSkippedToday(true);
    };
    if (Platform.OS === 'web') {
      if ((window as any).confirm('Skip today\'s workout? Your coach will be notified.')) go();
      return;
    }
    Alert.alert("Skip today's workout?", 'Your coach will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip workout', style: 'destructive', onPress: go },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  const todayName = getTodayDayOfWeek();

  const plan = useMemo(() => {
    if (!client) return null;
    const workout = getTodaysWorkout(client.workout_program ?? null);
    const days = normalizeMealPlan(client.meal_plan);
    const mealDay =
      days.find((d) => d.day?.toLowerCase() === todayName.toLowerCase()) ?? days[0] ?? null;
    const meals = mealDay?.meals ?? [];
    const sum = (k: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g') =>
      meals.reduce((t, m) => t + (typeof m[k] === 'number' ? (m[k] as number) : 0), 0);
    const supplements = Array.isArray(client.current_supplements) ? client.current_supplements.length : 0;
    const protocolCount =
      (client.current_peds?.length ?? 0) +
      (client.current_peptides?.length ?? 0) +
      (client.medical_protocol?.length ?? 0) +
      (client.protocol_sections?.filter((s) => s.kind !== 'supplements').length ?? 0);
    return {
      workout,
      meals,
      kcal: sum('calories'),
      protein: sum('protein_g'),
      carbs: sum('carbs_g'),
      fat: sum('fat_g'),
      supplements,
      protocolCount,
    };
  }, [client, todayName]);

  const weight = useMemo(() => {
    const withWeight = recentCheckins.filter((c) => c.weight_lbs != null);
    if (withWeight.length === 0) return null;
    const latest = withWeight[0].weight_lbs as number;
    // Compare with the first weigh-in at least 6 days older, else the oldest.
    const latestDate = new Date(withWeight[0].date).getTime();
    const prior =
      withWeight.find((c) => latestDate - new Date(c.date).getTime() >= 6 * 86400000) ??
      (withWeight.length > 1 ? withWeight[withWeight.length - 1] : null);
    const delta = prior ? latest - (prior.weight_lbs as number) : null;
    return { latest, delta };
  }, [recentCheckins]);

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

  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const checkedInToday = recentCheckins[0]?.date === localToday;
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require('../../assets/fbf-logo.jpg')} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brandName}>FORGED BY FREEDOM</Text>
            <Text style={styles.brandSub}>MONSTERS ARE REAL</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
        >
          <Ionicons name="person-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View style={styles.greeting}>
        <Eyebrow>{dateLabel}{streak?.current_streak ? ` · ${streak.current_streak}-day streak` : ''}</Eyebrow>
        <DisplayText size={34}>Your plan for today{client.first_name ? `, ${client.first_name}` : ''}.</DisplayText>
      </View>

      {/* Primary action */}
      <TouchableOpacity
        style={[styles.cta, checkedInToday && styles.ctaDone]}
        onPress={() => router.push('/checkin/0')}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Ionicons
          name={checkedInToday ? 'checkmark-circle' : 'add'}
          size={20}
          color={checkedInToday ? colors.accentText : colors.onAccent}
        />
        <Text style={[styles.ctaText, checkedInToday && styles.ctaTextDone]}>
          {checkedInToday ? 'Checked in today — update it' : 'Start check-in'}
        </Text>
      </TouchableOpacity>

      {/* Coach */}
      <SectionCard
        eyebrow="Your coach"
        title="Message your coach"
        subtitle="Questions, updates and check-in feedback in one thread."
        right={
          <TouchableOpacity
            style={styles.iconBtnDark}
            onPress={() => router.push('/(tabs)/chat')}
            accessibilityRole="button"
            accessibilityLabel="Open messages"
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <CoachUpdatesCard />

      {/* What do I do today? */}
      <SectionCard eyebrow="What do I do today?" title="Coach-approved plan">
        <PlanRow
          n={1}
          title={plan?.workout ? formatDayName(plan.workout) : 'Rest day'}
          detail={
            plan?.workout
              ? `${plan.workout.exercises.length} exercises`
              : 'Optional — start any workout from Train'
          }
          onPress={() => router.push('/(tabs)/workouts')}
        />
        {plan?.workout ? (
          <TouchableOpacity onPress={skippedToday ? undefined : skipWorkout} disabled={skippedToday} style={styles.skipBtn} accessibilityRole="button">
            <Text style={styles.skipText}>{skippedToday ? 'Workout skipped today · coach notified' : "Can't train today?"}</Text>
          </TouchableOpacity>
        ) : null}
        <PlanRow
          n={2}
          title={plan && plan.meals.length ? `${plan.meals.length} meals${plan.kcal ? ` · ${Math.round(plan.kcal).toLocaleString()} kcal` : ''}` : 'Meal plan'}
          detail={
            plan && plan.kcal
              ? `P ${Math.round(plan.protein)} · C ${Math.round(plan.carbs)} · F ${Math.round(plan.fat)}`
              : plan && plan.meals.length
              ? 'Open for foods and amounts'
              : 'Your coach will publish your meals here'
          }
          onPress={() => router.push('/(tabs)/meals')}
        />
        <PlanRow
          n={3}
          title={plan?.supplements ? `${plan.supplements} supplements` : 'Supplements & protocol'}
          detail={plan?.protocolCount ? 'Includes your private protocol' : 'Tap to log what you have taken'}
          onPress={() => router.push('/supplements')}
        />
      </SectionCard>

      {/* Weekly check-in (photos) */}
      <TouchableOpacity onPress={() => router.push('/weekly-checkin')} accessibilityRole="button" activeOpacity={0.85}>
        <SectionCard
          eyebrow="Weekly check-in"
          title="Photos, weight & how the week went"
          subtitle="Front, side and back. Your coach reviews it and replies."
          right={<Ionicons name="camera-outline" size={22} color={colors.accentText} />}
          highlight
        />
      </TouchableOpacity>

      {/* Water */}
      <HydrationCard targetOz={client.target_water_oz ?? null} />

      {/* Progress */}
      <TouchableOpacity onPress={() => router.push('/progress')} accessibilityRole="button" activeOpacity={0.85}>
        <SectionCard
          eyebrow="Progress"
          title={
            weight
              ? weight.delta != null
                ? `${weight.delta > 0 ? '+' : weight.delta < 0 ? '−' : ''}${Math.abs(weight.delta).toFixed(1)} lb`
                : `${weight.latest.toFixed(1)} lb`
              : 'Your progress'
          }
          subtitle={
            weight ? `Latest weigh-in ${weight.latest.toFixed(1)} lb · trends, scans and history` : 'Trends, body scans and check-in history'
          }
          right={<Ionicons name="chevron-forward" size={20} color={colors.accentText} />}
        />
      </TouchableOpacity>

      <AppleHealthCard />

      {/* Explore — compact, below the daily work */}
      <View style={styles.explore}>
        <Eyebrow style={{ marginBottom: spacing.xs }}>Explore</Eyebrow>
        <ExploreRow icon="scan-outline" label="Body scan" onPress={() => router.push('/bodyscan')} />
        <ExploreRow icon="flask-outline" label="Peptide catalog" onPress={() => router.push('/peptides')} />
        <ExploreRow icon="cart-outline" label="FBF peptide order form" onPress={() => WebBrowser.openBrowserAsync('https://ezformz.net/f/fbf-peptide-catalog-ew6n4u')} />
        <ExploreRow icon="trophy-outline" label="FBF Recomp Protocol" onPress={() => WebBrowser.openBrowserAsync('https://forgedbyfreedom.net/programs/')} />
        <ExploreRow icon="globe-outline" label="forgedbyfreedom.net" onPress={() => WebBrowser.openBrowserAsync('https://forgedbyfreedom.net/')} />
        <ExploreRow icon="bag-outline" label="FBF Store" onPress={() => Linking.openURL('https://www.etsy.com/shop/FBFStrengthNutrition')} last />
      </View>

      <View style={{ height: spacing.xxxl * 2 }} />
    </ScrollView>
  );
}

function PlanRow({ n, title, detail, onPress }: { n: number; title: string; detail: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.planRow} onPress={onPress} accessibilityRole="button" activeOpacity={0.8}>
      <View style={styles.planNum}>
        <Text style={styles.planNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

function ExploreRow({ icon, label, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.exploreRow, !last && styles.exploreDivider]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={colors.accentText} />
      <Text style={styles.exploreLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brandName: { fontFamily: fonts.display, fontSize: 15, fontWeight: '600', letterSpacing: 2, color: colors.textPrimary },
  brandSub: { fontSize: 10, letterSpacing: 2, color: colors.textSecondary },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { gap: 6, marginTop: spacing.sm },
  cta: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  ctaDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderAccent },
  ctaText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  ctaTextDone: { color: colors.accentText },
  skipBtn: { marginLeft: 40, minHeight: 36, justifyContent: 'center' },
  skipText: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  planNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNumText: { color: colors.accentText, fontSize: 12, fontWeight: '700' },
  planTitle: { color: colors.textPrimary, fontSize: fontSize.md - 1, fontWeight: '600' },
  planDetail: { color: colors.textSecondary, fontSize: 12 },
  explore: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  exploreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  exploreDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  exploreLabel: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm + 1 },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: spacing.xxl,
  },
  errorTitle: { fontSize: fontSize.xl, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
