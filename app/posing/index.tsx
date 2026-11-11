import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import {
  listMine,
  MinePosing,
  PosingSubmission,
  Division,
  statusMeta,
  divisionLabel,
  poseLabel,
} from '../../lib/posing';
import { colors, fontSize, spacing } from '../../lib/theme';

const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : '');

async function openClip(url: string | null) {
  if (!url) return;
  try {
    if (Platform.OS === 'web') Linking.openURL(url);
    else await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
}

export default function PosingStudioHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<MinePosing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [divKey, setDivKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const d = await listMine();
      setData(d);
      setDivKey((prev) => prev ?? d.default_division ?? d.divisions[0]?.key ?? null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load your posing clips');
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

  // Poll while a clip is awaiting the coach.
  const pending = data?.submissions.some((s) => s.status === 'submitted');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [pending, load]);

  const divisions: Division[] = data?.divisions ?? [];
  const activeDiv = useMemo(() => divisions.find((d) => d.key === divKey) ?? divisions[0] ?? null, [divisions, divKey]);
  const subs = data?.submissions ?? [];
  const latestFeedback = subs.find((s) => s.feedback && (s.status === 'needs_work' || s.status === 'approved' || s.status === 'reviewed'));

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
        <Eyebrow>Posing studio</Eyebrow>
        <DisplayText size={34}>Dial in your lines.</DisplayText>
        <Text style={styles.sub}>Film each mandatory pose, send it to your coach, and get written corrections back. Clips are for your coaching team only.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <SectionCard eyebrow="Couldn't load" title="Try again in a minute" subtitle={error} />
      ) : (
        <>
          {latestFeedback ? (
            <SectionCard
              eyebrow={`Latest feedback · ${latestFeedback.coach_name ?? 'Your coach'}`}
              title={`${latestFeedback.pose_label ?? poseLabel(latestFeedback.division, latestFeedback.pose, divisions)}`}
              subtitle={`${divisionLabel(latestFeedback.division, divisions)} · ${fmtDate(latestFeedback.reviewed_at ?? latestFeedback.created_at)}`}
              highlight
            >
              <StatusChip status={latestFeedback.status} score={latestFeedback.score} />
              <Text style={styles.feedback}>{latestFeedback.feedback}</Text>
              {latestFeedback.video_url ? (
                <TouchableOpacity style={styles.secondary} onPress={() => openClip(latestFeedback.video_url)} accessibilityRole="button">
                  <Ionicons name="play-circle-outline" size={18} color={colors.accentText} />
                  <Text style={styles.secondaryText}>Watch your clip</Text>
                </TouchableOpacity>
              ) : null}
            </SectionCard>
          ) : null}

          <SectionCard eyebrow="New clip" title="Record a pose" subtitle="One pose per clip, 10–20 seconds. Hold the pose steady so your coach can see every detail.">
            <TouchableOpacity style={styles.primary} onPress={() => router.push('/posing/capture')} accessibilityRole="button">
              <Ionicons name="videocam-outline" size={18} color={colors.onAccent} />
              <Text style={styles.primaryText}>Record a pose</Text>
            </TouchableOpacity>
          </SectionCard>

          {/* Mandatory-pose reference */}
          {divisions.length ? (
            <SectionCard eyebrow="Mandatory poses" title={activeDiv?.label ?? 'Reference'} subtitle="Tap your division. These are the poses judges score.">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {divisions.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.chip, d.key === activeDiv?.key && styles.chipOn]}
                    onPress={() => setDivKey(d.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: d.key === activeDiv?.key }}
                  >
                    <Text style={[styles.chipText, d.key === activeDiv?.key && styles.chipTextOn]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                {(activeDiv?.poses ?? []).map((p) => (
                  <View key={p.key} style={styles.poseRow}>
                    <View style={styles.poseDot}>
                      <Ionicons name="body-outline" size={16} color={colors.accentText} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.poseLabel}>{p.label}</Text>
                      <Text style={styles.poseTip}>{p.tip}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          ) : null}

          {/* History */}
          <SectionCard eyebrow="Your clips" title={subs.length ? `${subs.length} clip${subs.length === 1 ? '' : 's'}` : 'No clips yet'}>
            {subs.length === 0 ? (
              <Text style={styles.muted}>Record your first pose above. Your coach gets it the moment you upload, and their corrections show up here.</Text>
            ) : (
              subs.map((s) => <HistoryRow key={s.id} s={s} divisions={divisions} />)
            )}
          </SectionCard>
        </>
      )}
    </ScrollView>
  );
}

function StatusChip({ status, score }: { status: PosingSubmission['status']; score?: number | null }) {
  const m = statusMeta(status);
  const tone =
    m.tone === 'green' ? colors.green : m.tone === 'yellow' ? colors.yellow : m.tone === 'gold' ? colors.accentText : colors.textSecondary;
  return (
    <View style={styles.chipRow}>
      <View style={[styles.statusChip, { borderColor: tone }]}>
        <Text style={[styles.statusText, { color: tone }]}>{m.label}</Text>
      </View>
      {score != null ? (
        <View style={[styles.statusChip, { borderColor: colors.borderAccent }]}>
          <Text style={[styles.statusText, { color: colors.accentText }]}>Score {score}/10</Text>
        </View>
      ) : null}
    </View>
  );
}

function HistoryRow({ s, divisions }: { s: PosingSubmission; divisions: Division[] }) {
  const label = s.pose_label ?? poseLabel(s.division, s.pose, divisions);
  return (
    <View style={styles.histRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.histTitle}>{label}</Text>
          <Text style={styles.histMeta}>{divisionLabel(s.division, divisions)} · {fmtDate(s.created_at)}</Text>
        </View>
        {s.video_url ? (
          <TouchableOpacity onPress={() => openClip(s.video_url)} style={styles.playBtn} accessibilityRole="button" accessibilityLabel="Play clip">
            <Ionicons name="play-circle-outline" size={22} color={colors.accentText} />
          </TouchableOpacity>
        ) : null}
      </View>
      <StatusChip status={s.status} score={s.score} />
      {s.note ? <Text style={styles.histNote}>Your note: {s.note}</Text> : null}
      {s.feedback ? (
        <Text style={styles.histFeedback}>
          <Text style={styles.histFeedbackLabel}>{s.coach_name ?? 'Coach'}: </Text>
          {s.feedback}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 21 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  secondary: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.borderAccent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  secondaryText: { color: colors.accentText, fontWeight: '600' },
  muted: { color: colors.textSecondary, lineHeight: 20 },
  feedback: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 21 },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: { paddingHorizontal: spacing.md, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderColor: colors.borderAccent, backgroundColor: '#2A2414' },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  chipTextOn: { color: colors.accentText },
  poseRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  poseDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  poseLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSize.md },
  poseTip: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  histRow: { gap: 6, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  histTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSize.md },
  histMeta: { color: colors.textSecondary, fontSize: 12 },
  playBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  histNote: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  histFeedback: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20 },
  histFeedbackLabel: { color: colors.accentText, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 10, minHeight: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});
