import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

const API_BASE = 'https://forged-by-freedom-api-nm4f.onrender.com';

interface ScoreData {
  overall: number;
  vibe: string;
  categories: {
    nutrition: number;
    training: number;
    steps: number;
    recovery: number;
    metabolic: number;
    compliance: number;
  };
  explanation: string;
  streak_above_85: number;
  date: string;
  has_protocol: boolean;
}

interface Props {
  clientId: string;
}

const CATEGORY_CONFIG: { key: keyof ScoreData['categories']; label: string; icon: string }[] = [
  { key: 'nutrition', label: 'Nutrition', icon: '🍽️' },
  { key: 'training', label: 'Training', icon: '🏋️' },
  { key: 'steps', label: 'Steps/Cardio', icon: '👟' },
  { key: 'recovery', label: 'Recovery', icon: '😴' },
  { key: 'metabolic', label: 'Metabolic', icon: '🌡️' },
  { key: 'compliance', label: 'Protocol', icon: '💊' },
];

function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#ff6a00';
  return '#ef4444';
}

function getVibeEmoji(vibe: string): string {
  switch (vibe) {
    case 'exceptional': return '🔥';
    case 'strong': return '💪';
    case 'solid': return '👊';
    case 'decent': return '👍';
    case 'needs work': return '⚡';
    default: return '🔄';
  }
}

export function DailyScoreCard({ clientId }: Props) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScore();
  }, [clientId]);

  const fetchScore = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/client/${clientId}/daily-score`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json.score || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚡</Text>
          <Text style={styles.headerTitle}>FBF Daily Score</Text>
        </View>
        <ActivityIndicator color={colors.accent} style={{ padding: spacing.xl }} />
      </View>
    );
  }

  if (!data) return null;

  const scoreColor = getScoreColor(data.overall);
  const vibeEmoji = getVibeEmoji(data.vibe);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>FBF Daily Score</Text>
          <Text style={styles.headerSub}>
            {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        {data.streak_above_85 > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {data.streak_above_85}d</Text>
          </View>
        )}
      </View>

      {/* Big Score */}
      <View style={styles.scoreSection}>
        <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{data.overall}</Text>
          <Text style={styles.scoreMax}>/ 100</Text>
        </View>
        <View style={styles.vibeRow}>
          <Text style={styles.vibeEmoji}>{vibeEmoji}</Text>
          <Text style={[styles.vibeText, { color: scoreColor }]}>
            {data.vibe.charAt(0).toUpperCase() + data.vibe.slice(1)}
          </Text>
        </View>
      </View>

      {/* Category Bars */}
      <View style={styles.categoriesSection}>
        {CATEGORY_CONFIG.map(({ key, label, icon }) => {
          if (key === 'compliance' && !data.has_protocol) return null;
          const val = data.categories[key];
          const barColor = getScoreColor(val);
          return (
            <View key={key} style={styles.categoryRow}>
              <Text style={styles.catIcon}>{icon}</Text>
              <Text style={styles.catLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${val}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={[styles.catScore, { color: barColor }]}>{val}</Text>
            </View>
          );
        })}
      </View>

      {/* Explanation */}
      {data.explanation ? (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{data.explanation}</Text>
        </View>
      ) : null}

      {/* Streak */}
      {data.streak_above_85 > 1 && (
        <View style={styles.streakSection}>
          <Text style={styles.streakLabel}>PERFORMANCE STREAK</Text>
          <Text style={styles.streakValue}>{data.streak_above_85} days above 85</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  headerSub: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,106,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  scoreMax: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -2,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  vibeEmoji: {
    fontSize: 18,
  },
  vibeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoriesSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  catIcon: {
    fontSize: 14,
    width: 20,
  },
  catLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    width: 70,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  catScore: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    width: 28,
    textAlign: 'right',
  },
  explanationBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  explanationText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  streakSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  streakLabel: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  streakValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
