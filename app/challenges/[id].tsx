import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ChallengeLeaderboard } from '../../components/challenges/ChallengeLeaderboard';
import { JoinChallengeModal } from '../../components/challenges/JoinChallengeModal';
import { useChallenges } from '../../hooks/useChallenges';
import { useAuth } from '../../hooks/useAuth';
import { ChallengeEntry } from '../../types';
import {
  daysRemaining,
  daysUntilStart,
  formatDate,
  challengeTypeLabel,
} from '../../lib/challenge-utils';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

const STATUS_COLORS: Record<string, string> = {
  upcoming: '#3b82f6',
  active: colors.accent,
  completed: colors.green,
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client } = useAuth();
  const {
    challenges,
    getEntries,
    getMyEntry,
    joinChallenge,
    updateProgress,
    loadData,
  } = useChallenges();

  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [updateValue, setUpdateValue] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const challenge = challenges.find((c) => c.id === id);
  const myEntry = getMyEntry(id ?? '');
  const clientId = client?.id ?? '';

  const fetchEntries = useCallback(async () => {
    if (!id) return;
    setLoadingEntries(true);
    const data = await getEntries(id);
    setEntries(data);
    setLoadingEntries(false);
  }, [id, getEntries]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await fetchEntries();
    setRefreshing(false);
  }, [loadData, fetchEntries]);

  const handleJoin = async (baselineValue: number) => {
    if (!id) return;
    await joinChallenge(id, baselineValue);
    await fetchEntries();
  };

  const handleUpdateProgress = async () => {
    if (!id) return;
    const val = parseFloat(updateValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }
    setUpdating(true);
    try {
      await updateProgress(id, val);
      await fetchEntries();
      setUpdateValue('');
      Alert.alert('Updated', 'Your progress has been recorded.');
    } catch {
      Alert.alert('Error', 'Failed to update progress.');
    } finally {
      setUpdating(false);
    }
  };

  if (!challenge) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
        <BrandHeader title="Challenge" />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.notFoundText}>Challenge not found</Text>
          <Button title="Go Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[challenge.status] || colors.textSecondary;
  const remaining = challenge.status === 'active' ? daysRemaining(challenge.end_date) : 0;
  const untilStart =
    challenge.status === 'upcoming' ? daysUntilStart(challenge.start_date) : 0;

  // Find my entry in the ranked entries list (for accurate rank)
  const myRankedEntry = entries.find((e) => e.client_id === clientId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <BrandHeader title={challenge.name} />

      {/* Status + Type badges */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {challenge.status.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.accentMuted }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            {challengeTypeLabel(challenge.type)}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{challenge.description}</Text>

      {/* Countdown */}
      {challenge.status === 'active' && remaining > 0 && (
        <Card style={styles.countdownCard}>
          <Ionicons name="flame" size={24} color={colors.accent} />
          <View>
            <Text style={styles.countdownNumber}>{remaining}</Text>
            <Text style={styles.countdownLabel}>days remaining</Text>
          </View>
        </Card>
      )}

      {challenge.status === 'upcoming' && untilStart > 0 && (
        <Card style={styles.countdownCard}>
          <Ionicons name="hourglass-outline" size={24} color="#3b82f6" />
          <View>
            <Text style={[styles.countdownNumber, { color: '#3b82f6' }]}>{untilStart}</Text>
            <Text style={styles.countdownLabel}>days until start</Text>
          </View>
        </Card>
      )}

      {/* Details */}
      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dates</Text>
          <Text style={styles.detailValue}>
            {formatDate(challenge.start_date)} — {formatDate(challenge.end_date)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{challenge.duration_weeks} weeks</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Metric</Text>
          <Text style={styles.detailValue}>{challenge.metric_label}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Participants</Text>
          <Text style={styles.detailValue}>{challenge.participant_count}</Text>
        </View>
        {challenge.prize_pool_description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prize</Text>
            <Text style={[styles.detailValue, { color: colors.gold }]}>
              {challenge.prize_pool_description}
            </Text>
          </View>
        )}
        {/* Entry fees removed — requires Apple IAP implementation */}
      </Card>

      {/* Rules */}
      {challenge.rules.length > 0 && (
        <Card>
          <Text style={styles.rulesTitle}>Rules</Text>
          {challenge.rules.map((rule, idx) => (
            <View key={idx} style={styles.ruleRow}>
              <Text style={styles.ruleBullet}>{idx + 1}.</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* My Progress (if entered) */}
      {myRankedEntry && (
        <Card style={styles.myProgressCard}>
          <Text style={styles.myProgressTitle}>My Progress</Text>
          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Baseline</Text>
              <Text style={styles.progressValue}>{myRankedEntry.baseline_value}</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Current</Text>
              <Text style={styles.progressValue}>{myRankedEntry.current_value}</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Change</Text>
              <Text
                style={[
                  styles.progressValue,
                  { color: myRankedEntry.change_pct > 0 ? colors.green : colors.textPrimary },
                ]}
              >
                {myRankedEntry.change_pct > 0 ? '+' : ''}
                {myRankedEntry.change_pct.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Rank</Text>
              <Text style={[styles.progressValue, { color: colors.accent }]}>
                #{myRankedEntry.rank}
              </Text>
            </View>
          </View>

          {challenge.status === 'active' && (
            <View style={styles.updateRow}>
              <TextInput
                style={styles.updateInput}
                placeholder="New value..."
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={updateValue}
                onChangeText={setUpdateValue}
                returnKeyType="done"
              />
              <Button
                title="Update"
                onPress={handleUpdateProgress}
                loading={updating}
                disabled={!updateValue.trim()}
                style={styles.updateBtn}
              />
            </View>
          )}
        </Card>
      )}

      {/* Join Button */}
      {!myEntry && challenge.status !== 'completed' && (
        <Button
          title={
            challenge.status === 'upcoming'
              ? 'Join This Challenge'
              : 'Join Now'
          }
          onPress={() => setShowJoinModal(true)}
          style={styles.joinBtn}
        />
      )}

      {/* Entry fee notice removed — requires Apple IAP */}

      {/* Leaderboard */}
      {!loadingEntries && (
        <View style={styles.leaderboardSection}>
          <ChallengeLeaderboard
            entries={entries}
            currentClientId={clientId}
            challengeType={challenge.type}
          />
        </View>
      )}

      <View style={{ height: spacing.xxxl * 3 }} />

      <JoinChallengeModal
        visible={showJoinModal}
        challenge={challenge}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoin}
      />
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
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  countdownNumber: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.accent,
  },
  countdownLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: -4,
  },
  detailsCard: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  rulesTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ruleBullet: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '700',
    width: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  myProgressCard: {
    marginTop: spacing.lg,
    borderColor: colors.accent,
  },
  myProgressTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  progressItem: {
    width: '45%',
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  updateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  updateInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  updateBtn: {
    minWidth: 90,
  },
  joinBtn: {
    marginTop: spacing.lg,
  },
  feeHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  leaderboardSection: {
    marginTop: spacing.xl,
  },
  notFound: {
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: fontSize.md,
    color: colors.textTertiary,
  },
});
