import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SectionCard } from '../ui/SectionCard';
import { Avatar } from '../ui/Avatar';
import { getCoachAnalytics, CoachAnalyticsResponse, AnalyticsClient } from '../../lib/coach-analytics';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');

/** Compliance + progress + feel for the signed-in coach's clients. */
export function CoachAnalytics() {
  const [data, setData] = useState<CoachAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getCoachAnalytics(30));
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+: /, '') : 'Could not load analytics.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data && !error) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!data) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.windowNote}>Last {data.window_days} days · {data.clients.length} client{data.clients.length === 1 ? '' : 's'}</Text>
      {data.clients.length === 0 ? (
        <SectionCard eyebrow="No clients" subtitle="Clients assigned to you will show their compliance and progress here." />
      ) : (
        data.clients.map((c) => <ClientRow key={c.id} c={c} />)
      )}
    </View>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (!points || points.length < 2) return null;
  const W = 120, H = 34, pad = 3;
  const lo = Math.min(...points), hi = Math.max(...points), rng = hi - lo || 1;
  const X = (i: number) => pad + (i * (W - 2 * pad)) / (points.length - 1);
  const Y = (v: number) => pad + ((hi - v) / rng) * (H - 2 * pad);
  const pts = points.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  return (
    <Svg width={W} height={H}>
      <Polyline points={pts} fill="none" stroke={colors.accent} strokeWidth={1.6} />
      <Circle cx={X(points.length - 1)} cy={Y(points[points.length - 1])} r={3} fill={colors.accentText} />
    </Svg>
  );
}

function Tile({ label, value, unit }: { label: string; value: number | string | null; unit?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileVal}>{value == null ? '—' : value}{value != null && unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function ClientRow({ c }: { c: AnalyticsClient }) {
  const router = useRouter();
  const d = c.weight.delta;
  const deltaColor = d == null ? colors.textSecondary : d < 0 ? colors.green : colors.yellow;
  const meals = c.compliance.meals_planned > 0 ? `${c.compliance.meals_eaten}/${c.compliance.meals_planned}` : '—';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/client/${c.id}`)} accessibilityRole="button">
      <SectionCard>
        <View style={styles.head}>
          <Avatar uri={c.avatar_url} name={c.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{c.name}</Text>
            <Text style={styles.plan}>{c.plan || 'No plan'} · last check-in {fmtDate(c.last_checkin)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>

        <View style={styles.weightRow}>
          <View style={{ gap: 2 }}>
            {c.weight.last != null ? (
              <Text style={styles.weightBig}>{c.weight.last}<Text style={styles.weightUnit}> lb</Text></Text>
            ) : (
              <Text style={styles.noData}>No weight logged</Text>
            )}
            {d != null ? <Text style={[styles.delta, { color: deltaColor }]}>{d > 0 ? '+' : ''}{d} lb · {c.weight.n} weigh-ins</Text> : null}
          </View>
          <Sparkline points={c.weight.points} />
        </View>

        <View style={styles.tiles}>
          <Tile label="Mood" value={c.feel.mood} unit="/10" />
          <Tile label="Stress" value={c.feel.stress} unit="/10" />
          <Tile label="Sleep" value={c.feel.sleep} unit="h" />
        </View>

        <Text style={styles.compliance}>
          <Text style={styles.cLabel}>Logged {c.compliance.window_days}d: </Text>
          meals {meals} · trained {c.compliance.trained_days}d · water {c.compliance.water_avg != null ? `${Math.round(c.compliance.water_avg)} oz avg` : '—'}
        </Text>
        {c.intake.calories != null || c.intake.protein_g != null ? (
          <Text style={styles.intake}>
            Intake avg: {c.intake.calories != null ? `${Math.round(c.intake.calories)} kcal` : '—'}
            {c.intake.protein_g != null ? ` · ${Math.round(c.intake.protein_g)} g protein` : ''}
          </Text>
        ) : null}

        {c.flags.length ? (
          <View style={styles.flags}>
            {c.flags.map((f, i) => (
              <View key={i} style={styles.flag}><Text style={styles.flagText}>{f}</Text></View>
            ))}
          </View>
        ) : null}
      </SectionCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  windowNote: { color: colors.textSecondary, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  error: { color: colors.red, marginTop: spacing.lg, fontSize: fontSize.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSize.md },
  plan: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  weightBig: { color: colors.accentText, fontFamily: fonts.display, fontSize: 30 },
  weightUnit: { fontSize: fontSize.sm, color: colors.textSecondary, fontFamily: undefined },
  weightDelta: {},
  delta: { fontSize: fontSize.xs, fontWeight: '700' },
  noData: { color: colors.textTertiary, fontSize: fontSize.sm, fontStyle: 'italic' },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: spacing.sm, alignItems: 'center' },
  tileVal: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 18 },
  tileUnit: { fontSize: 10, color: colors.textSecondary },
  tileLabel: { color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  compliance: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  cLabel: { color: colors.textPrimary, fontWeight: '700' },
  intake: { color: colors.textSecondary, fontSize: fontSize.sm },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  flag: { borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: '#171510', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  flagText: { color: colors.yellow, fontSize: 11, fontWeight: '700' },
});
