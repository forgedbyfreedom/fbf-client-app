import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { StreakCard } from '../../components/dashboard/StreakCard';
import { BadgeGallery } from '../../components/gamification/BadgeGallery';
import { LeaderboardCard } from '../../components/gamification/LeaderboardCard';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function CompeteScreen() {
  const insets = useSafeAreaInsets();
  const { client, streak, earnedBadges, allBadges, refreshClientData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(client?.leaderboard_opt_in ?? false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  const handleLeaderboardOptInChange = useCallback((newValue: boolean) => {
    setLeaderboardOptIn(newValue);
    refreshClientData();
  }, [refreshClientData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <Text style={styles.title}>Compete</Text>

      <View style={styles.streakWrapper}>
        <StreakCard streak={streak} />
      </View>

      <BadgeGallery allBadges={allBadges} earnedBadges={earnedBadges} />

      {client && (
        <LeaderboardCard
          clientId={client.id}
          isOptedIn={leaderboardOptIn}
          onOptInChange={handleLeaderboardOptInChange}
        />
      )}
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  streakWrapper: {
    marginBottom: spacing.lg,
  },
});
