import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { listScans, MineResponse, ScanSummary, kgToLb } from '../../lib/bodyscan';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

export default function BodyScanHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<MineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await listScans());
    } catch (e: any) {
      setError(e?.message ?? 'Could not load scans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Poll while a scan is processing.
  const pending = data?.scans.some((s) => s.status === 'queued' || s.status === 'processing');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [pending, load]);

  const done = (data?.scans ?? []).filter((s) => s.status === 'complete');
  const latest = done[0];
  const prev = done[1];
  const delta = latest?.bf_percent != null && prev?.bf_percent != null ? Math.round((latest.bf_percent - prev.bf_percent) * 10) / 10 : null;
  const pricing = data?.pricing;
  const priceLine =
    pricing?.mode === 'free'
      ? 'Included with your plan'
      : pricing?.mode === 'paid'
        ? `$${pricing.price_usd} per scan · ${pricing.credits} credit${pricing.credits === 1 ? '' : 's'} left`
        : 'Included with every coaching plan';
  const canScan = pricing?.mode === 'free' || (pricing?.mode === 'paid' && pricing.credits > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={{ gap: 6 }}>
        <Eyebrow>Body scan</Eyebrow>
        <DisplayText size={34}>360° body composition.</DisplayText>
        <Text style={styles.sub}>One slow turn on video plus your tape measurements. No BMI — body fat, lean mass and every measurement, with the uncertainty shown.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <SectionCard eyebrow="Couldn't load" title="Try again in a minute" subtitle={error} />
      ) : (
        <>
          {latest ? (
            <TouchableOpacity onPress={() => router.push(`/bodyscan/report?id=${latest.id}`)} accessibilityRole="button">
              <SectionCard eyebrow={`Latest · ${latest.created_at?.slice(0, 10)}`} highlight right={<Ionicons name="chevron-forward" size={20} color={colors.accentText} />}>
                <View style={styles.heroRow}>
                  <Text style={styles.heroNum}>{latest.bf_percent ?? '—'}%</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.heroLabel}>body fat</Text>
                    {latest.bf_low != null && latest.bf_high != null ? <Text style={styles.heroMeta}>range {latest.bf_low}–{latest.bf_high}%</Text> : null}
                    {delta != null ? (
                      <Text style={[styles.heroMeta, { color: delta <= 0 ? colors.green : colors.yellow }]}>
                        {delta > 0 ? '+' : ''}{delta}% since last scan
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.statRow}>
                  {latest.lean_mass_kg != null ? <Stat label="Lean mass" value={`${kgToLb(latest.lean_mass_kg)} lb`} /> : null}
                  {latest.category ? <Stat label="Category" value={latest.category} /> : null}
                </View>
                <Text style={styles.link}>View full report</Text>
              </SectionCard>
            </TouchableOpacity>
          ) : null}

          <SectionCard eyebrow="New scan" title={latest ? 'Scan again' : 'Take your first scan'} subtitle={priceLine}>
            <TouchableOpacity
              style={[styles.primary, !canScan && styles.off]}
              onPress={() => router.push('/bodyscan/capture')}
              disabled={!canScan}
              accessibilityRole="button"
            >
              <Ionicons name="videocam-outline" size={18} color={colors.onAccent} />
              <Text style={styles.primaryText}>Start a scan</Text>
            </TouchableOpacity>
            {pricing?.mode === 'paid' && pricing.credits < 1 && pricing.payment_url ? (
              <TouchableOpacity style={styles.secondary} onPress={() => Linking.openURL(pricing.payment_url)} accessibilityRole="button">
                <Text style={styles.secondaryText}>Buy a scan · ${pricing.price_usd}</Text>
              </TouchableOpacity>
            ) : null}
            {pricing?.mode === 'denied' ? (
              <TouchableOpacity style={styles.secondary} onPress={() => Linking.openURL('https://forgedbyfreedom.net/programs/')} accessibilityRole="button">
                <Text style={styles.secondaryText}>See coaching plans</Text>
              </TouchableOpacity>
            ) : null}
          </SectionCard>

          <SectionCard eyebrow="History" title={data?.scans.length ? `${data.scans.length} scan${data.scans.length === 1 ? '' : 's'}` : 'No scans yet'}>
            {(data?.scans ?? []).length === 0 ? (
              <Text style={styles.muted}>Your first scan takes about two minutes. Results usually arrive within a few minutes.</Text>
            ) : (
              data!.scans.map((s) => <ScanRow key={s.id} scan={s} onOpen={() => router.push(`/bodyscan/report?id=${s.id}`)} />)
            )}
          </SectionCard>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ScanRow({ scan, onOpen }: { scan: ScanSummary; onOpen: () => void }) {
  const done = scan.status === 'complete';
  return (
    <TouchableOpacity style={styles.row} disabled={!done} onPress={onOpen} accessibilityRole="button">
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowDate}>{scan.created_at?.slice(0, 10)}</Text>
        {scan.status === 'failed' ? <Text style={[styles.rowMeta, { color: colors.red }]}>{scan.fail_reason ?? 'Scan failed — try again'}</Text> : null}
        {!done && scan.status !== 'failed' ? <Text style={styles.rowMeta}>Processing… usually a few minutes</Text> : null}
        {done && scan.bf_low != null ? <Text style={styles.rowMeta}>{scan.bf_low}–{scan.bf_high}%</Text> : null}
      </View>
      {done ? <Text style={styles.rowBf}>{scan.bf_percent}%</Text> : scan.status !== 'failed' ? <ActivityIndicator color={colors.accent} size="small" /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 21 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroNum: { color: colors.accentText, fontFamily: fonts.display, fontSize: 56, lineHeight: 62 },
  heroLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: fontSize.md },
  heroMeta: { color: colors.textSecondary, fontSize: 13 },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: spacing.md, gap: 2 },
  statLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 18 },
  link: { color: colors.accentText, fontWeight: '600' },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.accentText, fontWeight: '600' },
  off: { opacity: 0.45 },
  muted: { color: colors.textSecondary },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8 },
  rowDate: { color: colors.textPrimary, fontWeight: '600' },
  rowMeta: { color: colors.textSecondary, fontSize: 12 },
  rowBf: { color: colors.accentText, fontFamily: fonts.display, fontSize: 22 },
});
