import React, { useCallback, useEffect, useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { PhotoCompare } from '../../components/progress/PhotoCompare';
import { getCoachClient, sendCheckinFeedback, CoachClientDetail, HubCheckin } from '../../lib/hub';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

const SCORE_LABELS: Record<string, string> = {
  adherence: 'Adherence',
  energy: 'Energy',
  sleep_quality: 'Sleep',
  pumps: 'Pumps',
  strength: 'Strength',
  hunger: 'Hunger',
  digestion: 'Digestion',
  stress: 'Stress',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Coach view of one client: compliance, changes they made, check-ins with photos, labs. */
export default function CoachClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CoachClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getCoachClient(Number(id)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+: /, '') : 'Could not load this client.');
    }
  }, [id]);

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

      {!data && !error ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <Avatar uri={data.client.avatar_url} name={data.client.name} size={72} />
            <View style={{ gap: 4, flex: 1 }}>
              <Eyebrow>Client</Eyebrow>
              <DisplayText size={30}>{data.client.name}</DisplayText>
              <Text style={styles.muted}>{data.client.email}</Text>
            </View>
          </View>

          <SectionCard eyebrow="Compliance" title="Last 14 days">
            {data.daily.length === 0 ? (
              <Text style={styles.muted}>No daily data yet. It appears once they use the app's water, meals and workouts.</Text>
            ) : (
              data.daily.map((d) => (
                <View key={d.day} style={styles.dayRow}>
                  <View style={[styles.dot, { backgroundColor: d.shortfalls.length ? colors.yellow : colors.green }]} />
                  <Text style={styles.dayDate}>{fmtDate(d.day + 'T12:00:00')}</Text>
                  <Text style={styles.dayText} numberOfLines={2}>
                    {d.shortfalls.length
                      ? d.shortfalls.join(' · ')
                      : [
                          d.data.meals_planned ? `meals ${d.data.meals_eaten ?? 0}/${d.data.meals_planned}` : null,
                          d.data.water_oz != null ? `water ${d.data.water_oz} oz` : null,
                          d.data.trained ? 'trained' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'on plan'}
                  </Text>
                </View>
              ))
            )}
          </SectionCard>

          <PhotoCompare checkins={data.checkins} title="Progress photos" />

          {data.checkins.map((c) => (
            <CheckinCard key={c.id} checkin={c} onSaved={load} />
          ))}

          <SectionCard eyebrow="Activity" title="Changes & alerts">
            {data.events.length === 0 ? <Text style={styles.muted}>Nothing yet.</Text> : null}
            {data.events.slice(0, 30).map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <Ionicons
                  name={e.kind === 'change' ? 'create-outline' : e.kind === 'miss' ? 'alert-circle-outline' : e.kind === 'checkin' ? 'camera-outline' : 'flask-outline'}
                  size={16}
                  color={e.kind === 'miss' ? colors.yellow : colors.accentText}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventText}>{e.summary}</Text>
                  {Array.isArray(e.details)
                    ? (e.details as string[]).slice(0, 6).map((l, i) => (
                        <Text key={i} style={styles.eventDetail}>• {l}</Text>
                      ))
                    : null}
                </View>
                <Text style={styles.eventTime}>{fmtDate(e.created_at)}</Text>
              </View>
            ))}
          </SectionCard>

          {data.bloodwork[0] ? (
            <SectionCard
              eyebrow="Bloodwork"
              title={`Labs ${data.bloodwork[0].collected_on ?? fmtDate(data.bloodwork[0].uploaded_at)}`}
              subtitle={`${data.bloodwork[0].markers.length} markers · ${data.bloodwork[0].markers.filter((m) => m.flag === 'high' || m.flag === 'low').length} out of range`}
            >
              {data.bloodwork[0].markers
                .filter((m) => m.flag === 'high' || m.flag === 'low')
                .map((m, i) => (
                  <View key={i} style={styles.labRow}>
                    <Text style={styles.labName}>{m.name}</Text>
                    <Text style={[styles.labValue, { color: m.flag === 'high' ? colors.yellow : colors.blue }]}>
                      {m.value} {m.unit ?? ''} {m.flag === 'high' ? '↑' : '↓'}
                    </Text>
                  </View>
                ))}
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function CheckinCard({ checkin, onSaved }: { checkin: HubCheckin; onSaved: () => void }) {
  const [text, setText] = useState(checkin.feedback ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const f = checkin.fields;

  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await sendCheckinFeedback(checkin.id, text.trim());
      setMsg('Sent — your client got an email.');
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      eyebrow={`Check-in · ${fmtDate(checkin.created_at)}`}
      title={f.weight_lbs != null ? `${f.weight_lbs} lb` : 'Weekly check-in'}
      subtitle={[f.training_week, f.sleep_hours ? `${f.sleep_hours} h sleep` : null, f.cardio_minutes ? `${f.cardio_minutes} min cardio` : null].filter(Boolean).join(' · ') || undefined}
    >
      {f.scores && Object.keys(f.scores).length ? (
        <View style={styles.scores}>
          {Object.entries(f.scores).map(([k, v]) => (
            <View key={k} style={styles.score}>
              <Text style={styles.scoreVal}>{v}</Text>
              <Text style={styles.scoreLabel}>{SCORE_LABELS[k] ?? k}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {f.notes ? <Text style={styles.body}>{f.notes}</Text> : null}
      {f.protocol_notes ? (
        <Text style={styles.body}>
          <Text style={styles.bodyLabel}>Protocol: </Text>
          {f.protocol_notes}
        </Text>
      ) : null}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Your feedback to the client"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={styles.area}
      />
      <TouchableOpacity style={[styles.primary, (!text.trim() || busy) && { opacity: 0.5 }]} onPress={save} disabled={!text.trim() || busy} accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>{checkin.feedback ? 'Update feedback' : 'Send feedback'}</Text>}
      </TouchableOpacity>
      {msg ? <Text style={styles.muted}>{msg}</Text> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.red, marginTop: spacing.lg },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dayDate: { color: colors.textPrimary, fontSize: 12, width: 92 },
  dayText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  eventRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  eventText: { color: colors.textPrimary, fontSize: fontSize.sm },
  eventDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  eventTime: { color: colors.textTertiary, fontSize: 11 },
  scores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  score: { width: '22%', minWidth: 64, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: spacing.sm, alignItems: 'center' },
  scoreVal: { color: colors.accentText, fontFamily: fonts.display, fontSize: 20 },
  scoreLabel: { color: colors.textSecondary, fontSize: 11 },
  body: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20 },
  bodyLabel: { color: colors.accentText, fontWeight: '700' },
  area: { minHeight: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, padding: spacing.md, fontSize: fontSize.sm + 1, textAlignVertical: 'top' },
  primary: { minHeight: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  labName: { color: colors.textPrimary, fontSize: fontSize.sm, flex: 1 },
  labValue: { fontSize: fontSize.sm, fontWeight: '700' },
});
