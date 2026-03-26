import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

const API_BASE = 'https://forged-by-freedom-api-nm4f.onrender.com';

interface ProjectionData {
  current_weight: number;
  goal_weight: number | null;
  weekly_rate: number;
  phase: string;
  rate_assessment: string;
  eta_weeks: number | null;
  eta_date: string | null;
  projections: { week: number; projected_weight: number }[];
  data_points: number;
  trend_direction?: 'losing' | 'gaining' | 'maintaining';
}

interface Props {
  clientId: string;
}

export function ProgressProjection({ clientId }: Props) {
  const [data, setData] = useState<ProjectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjection();
  }, [clientId]);

  const fetchProjection = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/client/${clientId}/progress-projection`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setData(json.projection || null);
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
          <Text style={styles.headerIcon}>📈</Text>
          <Text style={styles.headerTitle}>Progress Projection</Text>
        </View>
        <ActivityIndicator color={colors.accent} style={{ padding: spacing.xl }} />
      </View>
    );
  }

  if (!data) return null;

  // Derive trend_direction from weekly_rate if not provided
  const trendDirection = data.trend_direction || (data.weekly_rate < -0.1 ? 'losing' : data.weekly_rate > 0.1 ? 'gaining' : 'maintaining');
  const directionIcon = trendDirection === 'losing' ? '↓' : trendDirection === 'gaining' ? '↑' : '→';
  const directionColor = data.phase === 'cutting'
    ? (trendDirection === 'losing' ? colors.green : colors.red)
    : data.phase === 'bulking'
      ? (trendDirection === 'gaining' ? colors.green : colors.yellow)
      : colors.textSecondary;

  const rateColor = data.rate_assessment === 'optimal' ? colors.green
    : data.rate_assessment === 'aggressive' ? colors.red
    : data.rate_assessment === 'slow' ? colors.yellow
    : colors.textSecondary;

  const goalWeight = data.goal_weight;
  const hasGoal = goalWeight != null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📈</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Progress Projection</Text>
          <Text style={styles.headerSub}>Based on {data.data_points} weigh-ins</Text>
        </View>
        <View style={[styles.phaseBadge, { backgroundColor: `${directionColor}20` }]}>
          <Text style={[styles.phaseText, { color: directionColor }]}>
            {data.phase.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Key Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{data.current_weight.toFixed(1)}</Text>
          <Text style={styles.statUnit}>lbs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Goal</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {hasGoal ? goalWeight.toFixed(1) : '—'}
          </Text>
          <Text style={styles.statUnit}>{hasGoal ? 'lbs' : 'not set'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Weekly Rate</Text>
          <Text style={[styles.statValue, { color: directionColor }]}>
            {directionIcon} {Math.abs(data.weekly_rate).toFixed(1)}
          </Text>
          <Text style={styles.statUnit}>lbs/wk</Text>
        </View>
      </View>

      {/* Rate Assessment */}
      <View style={styles.assessmentRow}>
        <View style={[styles.assessmentDot, { backgroundColor: rateColor }]} />
        <Text style={[styles.assessmentText, { color: rateColor }]}>
          {data.rate_assessment === 'optimal' ? 'Optimal rate of change' :
           data.rate_assessment === 'aggressive' ? 'Rate may be too aggressive' :
           data.rate_assessment === 'slow' ? 'Rate slower than expected' :
           'Maintaining weight'}
        </Text>
      </View>

      {/* ETA */}
      {data.eta_weeks != null && (
        <View style={styles.etaBox}>
          <Text style={styles.etaLabel}>ESTIMATED TIME TO GOAL</Text>
          <Text style={styles.etaValue}>
            {data.eta_weeks} weeks
          </Text>
          {data.eta_date && (
            <Text style={styles.etaDate}>
              Target: {new Date(data.eta_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
      )}

      {/* Mini Projection Chart */}
      {data.projections.length > 0 && (
        <View style={styles.projectionSection}>
          <Text style={styles.projLabel}>12-WEEK PROJECTION</Text>
          <View style={styles.projRow}>
            {data.projections.filter((_, i) => i % 2 === 0).map((p) => (
              <View key={p.week} style={styles.projCol}>
                <Text style={styles.projWeight}>{p.projected_weight.toFixed(0)}</Text>
                <View style={[styles.projBar, {
                  height: Math.max(4, Math.min(40, hasGoal ? Math.abs(p.projected_weight - goalWeight) * 2 : 20)),
                  backgroundColor: hasGoal && Math.abs(p.projected_weight - goalWeight) < 2 ? colors.green : colors.accent,
                }]} />
                <Text style={styles.projWeek}>W{p.week}</Text>
              </View>
            ))}
          </View>
          {hasGoal && (
            <View style={styles.goalLine}>
              <View style={styles.goalDash} />
              <Text style={styles.goalLineLabel}>Goal: {goalWeight.toFixed(0)} lbs</Text>
            </View>
          )}
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
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  assessmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assessmentText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  etaBox: {
    margin: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 9,
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  etaValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  etaDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  projectionSection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  projLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  projRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  projCol: {
    alignItems: 'center',
    flex: 1,
  },
  projWeight: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  projBar: {
    width: 16,
    borderRadius: 4,
  },
  projWeek: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 4,
  },
  goalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  goalDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.green,
  },
  goalLineLabel: {
    fontSize: 10,
    color: colors.green,
    fontWeight: '700',
  },
});
