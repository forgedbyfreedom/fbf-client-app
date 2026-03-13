import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { api } from '../../lib/api';
import { Card } from '../ui/Card';
import { BodyScan, Client, ClientMetrics } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface VitalStatsCardProps {
  client: Client;
  metrics: ClientMetrics | null;
  latestCheckin: { weight_lbs: number | null } | null;
}

export function VitalStatsCard({ client, metrics, latestCheckin }: VitalStatsCardProps) {
  const [scans, setScans] = useState<BodyScan[]>([]);

  useEffect(() => {
    api.get<{ scans: BodyScan[] }>(`/api/clients/${client.id}/scans`)
      .then((res) => setScans(res.scans || []))
      .catch(() => {});
  }, [client.id]);

  const latestScan = scans[0] || null;
  const firstScan = scans.length > 1 ? scans[scans.length - 1] : null;
  const currentWeight = latestCheckin?.weight_lbs ?? metrics?.weight_current ?? client.last_weight ?? null;

  // Body composition deltas
  const bfDelta = firstScan && latestScan?.body_fat_pct != null && firstScan.body_fat_pct != null
    ? latestScan.body_fat_pct - firstScan.body_fat_pct
    : null;
  const smmDelta = firstScan && latestScan?.skeletal_muscle_mass_lbs != null && firstScan.skeletal_muscle_mass_lbs != null
    ? latestScan.skeletal_muscle_mass_lbs - firstScan.skeletal_muscle_mass_lbs
    : null;
  const leanDelta = firstScan && latestScan?.lean_mass_lbs != null && firstScan.lean_mass_lbs != null
    ? latestScan.lean_mass_lbs - firstScan.lean_mass_lbs
    : null;

  const chartWidth = Dimensions.get('window').width - 80;

  // Build body comp chart data from scans
  const bfPoints = scans
    .filter(s => s.body_fat_pct != null)
    .reverse()
    .map(s => ({ date: s.scan_date, value: s.body_fat_pct! }));

  const smmPoints = scans
    .filter(s => s.skeletal_muscle_mass_lbs != null)
    .reverse()
    .map(s => ({ date: s.scan_date, value: s.skeletal_muscle_mass_lbs! }));

  return (
    <View>
      <Text style={styles.sectionTitle}>Current Stats</Text>
      <Card>
        <View style={styles.statsGrid}>
          <StatBox
            label="Weight"
            value={currentWeight ? `${currentWeight}` : '--'}
            unit="lbs"
            delta={metrics?.weight_delta_7d}
            deltaLabel="7d"
          />
          <StatBox
            label="Body Fat"
            value={latestScan?.body_fat_pct != null ? `${latestScan.body_fat_pct}` : '--'}
            unit="%"
            delta={bfDelta}
            deltaLabel="total"
            invertDelta
          />
          <StatBox
            label="Lean Mass"
            value={latestScan?.lean_mass_lbs != null ? `${latestScan.lean_mass_lbs}` : '--'}
            unit="lbs"
            delta={leanDelta}
            deltaLabel="total"
          />
          <StatBox
            label="Muscle"
            value={latestScan?.skeletal_muscle_mass_lbs != null ? `${latestScan.skeletal_muscle_mass_lbs}` : '--'}
            unit="lbs"
            delta={smmDelta}
            deltaLabel="total"
          />
        </View>
      </Card>

      {/* BF% Trend Mini Chart */}
      {bfPoints.length >= 2 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Body Fat % Trend</Text>
          <MiniChart data={bfPoints} color={colors.red} unit="%" width={chartWidth} invertGood />
        </Card>
      )}

      {/* SMM Trend Mini Chart */}
      {smmPoints.length >= 2 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Skeletal Muscle Trend</Text>
          <MiniChart data={smmPoints} color={colors.green} unit=" lbs" width={chartWidth} />
        </Card>
      )}
    </View>
  );
}

function StatBox({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  invertDelta,
}: {
  label: string;
  value: string;
  unit: string;
  delta?: number | null;
  deltaLabel?: string;
  invertDelta?: boolean;
}) {
  const deltaColor = delta != null
    ? (invertDelta ? (delta < 0 ? colors.green : colors.red) : (delta > 0 ? colors.green : colors.red))
    : colors.textTertiary;

  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
      {delta != null && (
        <Text style={[styles.statDelta, { color: deltaColor }]}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} {deltaLabel}
        </Text>
      )}
    </View>
  );
}

function MiniChart({
  data,
  color,
  unit,
  width,
  invertGood,
}: {
  data: { date: string; value: number }[];
  color: string;
  unit: string;
  width: number;
  invertGood?: boolean;
}) {
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const height = 70;
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const changeGood = invertGood ? change < 0 : change > 0;

  return (
    <>
      <View style={[styles.chart, { width, height }]}>
        {data.map((d, i) => {
          const barH = ((d.value - min) / range) * (height - 16) + 16;
          const barW = Math.max((width / data.length) - 4, 8);
          return (
            <View key={d.date + i} style={styles.barCol}>
              <View style={[styles.bar, { height: barH, width: barW, backgroundColor: color }]} />
              <Text style={styles.barLabel}>
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.changeRow}>
        <Text style={styles.rangeText}>{min}{unit} - {max}{unit}</Text>
        <Text style={[styles.changeText, { color: changeGood ? colors.green : colors.red }]}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  statDelta: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  chartCard: {
    marginTop: spacing.sm,
  },
  chartTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barCol: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 3,
    opacity: 0.85,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    color: colors.textTertiary,
    marginTop: 3,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  rangeText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  changeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
