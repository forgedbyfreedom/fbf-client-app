import React from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { ChallengeCard } from '../../components/challenges/ChallengeCard';
import { Loading } from '../../components/ui/Loading';
import { useChallenges } from '../../hooks/useChallenges';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    activeChallenges,
    upcomingChallenges,
    completedChallenges,
    loading,
    loadData,
  } = useChallenges();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) return <Loading />;

  const hasNoChallenges =
    activeChallenges.length === 0 &&
    upcomingChallenges.length === 0 &&
    completedChallenges.length === 0;

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
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <BrandHeader title="Challenges" />

      <Text style={styles.subtitle}>
        Compete against the community using percentage-based metrics — fair for everyone.
      </Text>

      {hasNoChallenges && (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Challenges Yet</Text>
          <Text style={styles.emptyText}>
            Stay tuned — your coach will post challenges soon!
          </Text>
        </View>
      )}

      {activeChallenges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Active Challenges</Text>
          </View>
          {activeChallenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </View>
      )}

      {upcomingChallenges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hourglass-outline" size={18} color="#3b82f6" />
            <Text style={[styles.sectionTitle, { color: '#3b82f6' }]}>Upcoming</Text>
          </View>
          {upcomingChallenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </View>
      )}

      {completedChallenges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.green} />
            <Text style={[styles.sectionTitle, { color: colors.green }]}>Past Challenges</Text>
          </View>
          {completedChallenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </View>
      )}

      <View style={{ height: spacing.xxxl * 3 }} />
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
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
