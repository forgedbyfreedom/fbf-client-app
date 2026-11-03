/**
 * Body scan report. Results and measurements render natively everywhere;
 * the web app also embeds the full HTML report from the server (sandboxed).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { listScans, fetchReportHtml, measurementRows, kgToLb, ScanSummary } from '../../lib/bodyscan';
import { getAssessments, Assessment } from '../../lib/hub';
import { AssessmentCard } from '../../components/progress/AssessmentCard';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

export default function BodyScanReport() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [prev, setPrev] = useState<ScanSummary | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [assess, setAssess] = useState<{ a: Assessment; prev: Assessment | null } | null>(null);

  useEffect(() => {
    const sid = Number(id);
    listScans()
      .then(({ scans }) => {
        const done = scans.filter((s) => s.status === 'complete');
        const i = done.findIndex((s) => s.id === sid);
        setScan(scans.find((s) => s.id === sid) ?? null);
        setPrev(i >= 0 ? done[i + 1] ?? null : null);
        if (!scans.some((s) => s.id === sid)) setError('Scan not found.');
      })
      .catch((e) => setError(e?.message ?? 'Could not load scan'));
    if (Platform.OS === 'web') fetchReportHtml(sid).then(setHtml).catch(() => setHtml(null));
    getAssessments()
      .then((list) => {
        const i = list.findIndex((x) => x.scan_id === sid);
        setAssess(i >= 0 ? { a: list[i], prev: list[i + 1] ?? null } : null);
      })
      .catch(() => undefined);
  }, [id]);

  const rows = measurementRows(scan?.measurements);
  const prevRows = Object.fromEntries(measurementRows(prev?.measurements).map((r) => [r.label, r.value]));
  const delta = scan?.bf_percent != null && prev?.bf_percent != null ? Math.round((scan.bf_percent - prev.bf_percent) * 10) / 10 : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={{ gap: 6 }}>
        <Eyebrow>Body scan report</Eyebrow>
        <DisplayText size={32}>{scan?.created_at ? scan.created_at.slice(0, 10) : 'Report'}</DisplayText>
      </View>

      {error ? <SectionCard eyebrow="Couldn't load" subtitle={error} /> : null}
      {!scan && !error ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} /> : null}

      {scan && scan.status !== 'complete' ? (
        <SectionCard
          eyebrow={scan.status === 'failed' ? 'Scan failed' : 'Processing'}
          title={scan.status === 'failed' ? 'This one needs a redo' : 'Almost there'}
          subtitle={scan.status === 'failed' ? scan.fail_reason ?? 'Try again with fitted clothing and even light.' : 'Results usually arrive within a few minutes.'}
        />
      ) : null}

      {scan?.status === 'complete' ? (
        <>
          <SectionCard eyebrow="Body fat" highlight>
            <View style={styles.heroRow}>
              <Text style={styles.heroNum}>{scan.bf_percent}%</Text>
              <View style={{ flex: 1, gap: 2 }}>
                {scan.bf_low != null ? <Text style={styles.meta}>likely range {scan.bf_low}–{scan.bf_high}%</Text> : null}
                {scan.category ? <Text style={styles.meta}>{scan.category}</Text> : null}
                {delta != null ? (
                  <Text style={[styles.meta, { color: delta <= 0 ? colors.green : colors.yellow }]}>
                    {delta > 0 ? '+' : ''}{delta}% vs {prev?.created_at?.slice(0, 10)}
                  </Text>
                ) : null}
              </View>
            </View>
            {scan.lean_mass_kg != null ? (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Lean mass</Text>
                <Text style={styles.statValue}>{kgToLb(scan.lean_mass_kg)} lb</Text>
              </View>
            ) : null}
          </SectionCard>

          {assess ? <AssessmentCard a={assess.a} prev={assess.prev} eyebrow="Calipers & tape · this scan" /> : null}

          {rows.length ? (
            <SectionCard eyebrow="Measurements" title={prev ? 'This scan vs last' : undefined}>
              {rows.map((r) => (
                <View key={r.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  {prevRows[r.label] ? <Text style={styles.rowPrev}>{prevRows[r.label]}</Text> : null}
                  <Text style={styles.rowValue}>{r.value}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {scan.warnings?.length ? (
            <SectionCard eyebrow="Notes on this scan">
              {scan.warnings.map((w, i) => (
                <View key={i} style={styles.warn}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.yellow} />
                  <Text style={styles.warnText}>{w}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {Platform.OS === 'web' && html
            ? React.createElement('iframe', {
                title: 'Full body scan report',
                srcDoc: html,
                sandbox: 'allow-scripts',
                style: { width: '100%', height: 1400, border: `1px solid ${colors.border}`, borderRadius: 20, background: '#fff' },
              })
            : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroNum: { color: colors.accentText, fontFamily: fonts.display, fontSize: 60, lineHeight: 66 },
  meta: { color: colors.textSecondary, fontSize: 13 },
  stat: { backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: spacing.md, gap: 2 },
  statLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 20 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  rowPrev: { color: colors.textTertiary, fontSize: 13 },
  rowValue: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 17, minWidth: 70, textAlign: 'right' },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  warnText: { flex: 1, color: colors.textSecondary, lineHeight: 20 },
});
