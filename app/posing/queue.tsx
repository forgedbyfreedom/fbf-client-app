/**
 * Coach posing review queue. Clips the coach's assigned athletes have sent,
 * newest first. Play the clip, write a correction, and set the status —
 * "Needs work" or "Stage ready". The athlete gets an app alert and sees the
 * feedback in their Posing Studio. Mirrors the weekly check-in review pattern.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Avatar } from '../../components/ui/Avatar';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { reviewQueue, reviewSubmission, PosingQueue, PosingSubmission, QueueAthlete, statusMeta } from '../../lib/posing';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');

async function openClip(url: string | null) {
  if (!url) return;
  try {
    if (Platform.OS === 'web') Linking.openURL(url);
    else await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
}

export default function PosingQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<PosingQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await reviewQueue());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+: /, '') : 'Could not load the posing queue.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 80 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={{ gap: 6 }}>
        <Eyebrow>Coach</Eyebrow>
        <DisplayText size={32}>Posing review.</DisplayText>
        <Text style={styles.sub}>{data ? (data.awaiting ? `${data.awaiting} clip${data.awaiting === 1 ? '' : 's'} awaiting your review` : 'All caught up — no clips awaiting review.') : 'Loading…'}</Text>
      </View>

      {!data && !error ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data?.athletes.map((a) => (
        <AthleteBlock key={a.client_id} athlete={a} onReviewed={load} />
      ))}

      {data && data.athletes.length === 0 && !error ? (
        <SectionCard eyebrow="Nothing here yet" subtitle="When your athletes send posing clips, they'll appear here for review." />
      ) : null}
    </ScrollView>
  );
}

function AthleteBlock({ athlete, onReviewed }: { athlete: QueueAthlete; onReviewed: () => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.athleteRow}>
        <Avatar uri={athlete.client_avatar_url} name={athlete.client_name} size={40} />
        <Text style={styles.athleteName}>{athlete.client_name}</Text>
      </View>
      {athlete.submissions.map((s) => (
        <ReviewCard key={s.id} s={s} onReviewed={onReviewed} />
      ))}
    </View>
  );
}

function ReviewCard({ s, onReviewed }: { s: PosingSubmission; onReviewed: () => void }) {
  const [text, setText] = useState(s.feedback ?? '');
  const [score, setScore] = useState<string>(s.score != null ? String(s.score) : '');
  const [busy, setBusy] = useState<null | 'approved' | 'needs_work'>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const m = statusMeta(s.status);
  const tone = m.tone === 'green' ? colors.green : m.tone === 'yellow' ? colors.yellow : m.tone === 'gold' ? colors.accentText : colors.textSecondary;

  const send = async (status: 'approved' | 'needs_work') => {
    if (!text.trim() || busy) return;
    setBusy(status);
    setMsg(null);
    try {
      const n = parseInt(score, 10);
      await reviewSubmission(s.id, { feedback: text.trim(), status, score: Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : null });
      setMsg('Sent — your athlete got an alert.');
      onReviewed();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard
      eyebrow={`${s.division_label ?? s.division} · ${fmtDate(s.created_at)}`}
      title={s.pose_label ?? s.pose}
      right={<View style={[styles.statusChip, { borderColor: tone }]}><Text style={[styles.statusText, { color: tone }]}>{m.label}</Text></View>}
    >
      {s.note ? <Text style={styles.note}>Athlete: {s.note}</Text> : null}

      {s.video_url ? (
        <TouchableOpacity style={styles.play} onPress={() => openClip(s.video_url)} accessibilityRole="button">
          <Ionicons name="play-circle" size={22} color={colors.onAccent} />
          <Text style={styles.playText}>Play clip</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.muted}>Clip is still processing — pull to refresh.</Text>
      )}

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Your corrections — what to fix, what's working"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={styles.area}
      />

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Score (optional)</Text>
        <TextInput
          value={score}
          onChangeText={(t) => setScore(t.replace(/[^0-9]/g, '').slice(0, 2))}
          placeholder="—"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={styles.scoreInput}
          accessibilityLabel="Score out of 10"
        />
        <Text style={styles.scoreOutOf}>/ 10</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.needs, (!text.trim() || !!busy) && styles.off]} disabled={!text.trim() || !!busy} onPress={() => send('needs_work')} accessibilityRole="button">
          {busy === 'needs_work' ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.needsText}>Needs work</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.approve, (!text.trim() || !!busy) && styles.off]} disabled={!text.trim() || !!busy} onPress={() => send('approved')} accessibilityRole="button">
          {busy === 'approved' ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.approveText}>Stage ready</Text>}
        </TouchableOpacity>
      </View>
      {msg ? <Text style={styles.muted}>{msg}</Text> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 21 },
  error: { color: colors.red, marginTop: spacing.lg },
  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  athleteName: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 20 },
  note: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  play: { minHeight: 44, borderRadius: 12, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm },
  area: { minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, padding: spacing.md, fontSize: fontSize.sm + 1, textAlignVertical: 'top' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreLabel: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 },
  scoreInput: { width: 56, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, textAlign: 'center', fontFamily: fonts.display, fontSize: fontSize.lg },
  scoreOutOf: { color: colors.textSecondary, fontSize: fontSize.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  needs: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  needsText: { color: colors.yellow, fontWeight: '700', fontSize: fontSize.md },
  approve: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  off: { opacity: 0.45 },
  statusChip: { paddingHorizontal: 10, minHeight: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});
