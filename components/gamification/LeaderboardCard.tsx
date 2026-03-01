import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { LeaderboardEntry, LeaderboardResponse } from '../../types';

type SortMode = 'streak' | 'badges' | 'adherence';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'streak', label: 'Streak' },
  { key: 'badges', label: 'Badges' },
  { key: 'adherence', label: 'Adherence' },
];

const MEDAL_ICONS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

interface LeaderboardCardProps {
  clientId: string;
  isOptedIn: boolean;
  onOptInChange: (newValue: boolean) => void;
}

export function LeaderboardCard({
  clientId,
  isOptedIn,
  onOptInChange,
}: LeaderboardCardProps) {
  const [sort, setSort] = useState<SortMode>('streak');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LeaderboardResponse>(
        `/api/client/leaderboard?sort=${sort}`
      );
      setData(res);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    if (isOptedIn) {
      fetchLeaderboard();
    }
  }, [isOptedIn, fetchLeaderboard]);

  const handleToggleOptIn = async () => {
    setToggling(true);
    try {
      const res = await api.post<{ leaderboard_opt_in: boolean }>(
        '/api/client/leaderboard-opt-in',
        {}
      );
      onOptInChange(res.leaderboard_opt_in);
    } catch {
      // silently fail
    } finally {
      setToggling(false);
    }
  };

  const getSortValue = (entry: LeaderboardEntry): string => {
    if (sort === 'badges') return `${entry.badge_count}`;
    if (sort === 'adherence') return `${entry.adherence_7d}%`;
    return `${entry.current_streak}d`;
  };

  if (!isOptedIn) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.optInText}>
          Join the leaderboard to see how you stack up against other athletes in
          your gym.
        </Text>
        <Button
          title={toggling ? 'Joining...' : 'Join Leaderboard'}
          onPress={handleToggleOptIn}
          style={styles.optInBtn}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <TouchableOpacity onPress={handleToggleOptIn} disabled={toggling}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pills}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.pill, sort === opt.key && styles.pillActive]}
            onPress={() => setSort(opt.key)}
          >
            <Text
              style={[
                styles.pillText,
                sort === opt.key && styles.pillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <View style={styles.list}>
          {(data?.leaderboard ?? []).map((entry, i) => {
            const isMe = entry.client_id === clientId;
            return (
              <View
                key={entry.client_id}
                style={[styles.row, isMe && styles.rowHighlight]}
              >
                <View style={styles.rankCol}>
                  {i < 3 ? (
                    <Text style={styles.medal}>{MEDAL_ICONS[i]}</Text>
                  ) : (
                    <Text style={styles.rank}>{i + 1}</Text>
                  )}
                </View>
                <Text
                  style={[styles.name, isMe && styles.nameHighlight]}
                  numberOfLines={1}
                >
                  {entry.name}
                </Text>
                <Text style={[styles.value, isMe && styles.valueHighlight]}>
                  {getSortValue(entry)}
                </Text>
              </View>
            );
          })}
          {data?.leaderboard.length === 0 && (
            <Text style={styles.emptyText}>
              No one else has joined yet. Be the trailblazer!
            </Text>
          )}
        </View>
      )}

      {data?.myRank && (
        <Text style={styles.myRank}>Your rank: #{data.myRank}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaveText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  pills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  loader: {
    paddingVertical: spacing.xl,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  rowHighlight: {
    backgroundColor: colors.accentMuted,
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
  },
  medal: {
    fontSize: 18,
  },
  rank: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  name: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  nameHighlight: {
    fontWeight: '600',
    color: colors.accent,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  valueHighlight: {
    color: colors.accent,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  optInText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginVertical: spacing.md,
    lineHeight: 20,
  },
  optInBtn: {
    marginTop: spacing.sm,
  },
  myRank: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
