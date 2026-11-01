import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SectionCard, Eyebrow, DisplayText } from '../components/ui/SectionCard';
import { GuidedCamera } from '../components/checkin/GuidedCamera';
import { getCheckins, submitCheckin, HubCheckin, PhotoSlot, PickedPhoto, CheckinFields } from '../lib/hub';
import { colors, fontSize, fonts, spacing } from '../lib/theme';

const DRAFT_KEY = 'fbf_weekly_checkin_draft_v1';
const POSES: PhotoSlot[] = ['front', 'side', 'back'];

const SCALES: { key: string; label: string; low: string; high: string }[] = [
  { key: 'adherence', label: 'How well did you follow the plan?', low: 'Off plan', high: 'Nailed it' },
  { key: 'energy', label: 'Energy', low: 'Very low', high: 'Very high' },
  { key: 'sleep_quality', label: 'Sleep quality', low: 'Very poor', high: 'Excellent' },
  { key: 'pumps', label: 'Pumps', low: 'Flat', high: 'Full' },
  { key: 'strength', label: 'Strength', low: 'Very weak', high: 'Very strong' },
  { key: 'hunger', label: 'Hunger', low: 'None', high: 'Starving' },
  { key: 'digestion', label: 'Digestion', low: 'Poor', high: 'Great' },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'Very high' },
];

interface Draft {
  weight: string;
  sleep: string;
  cardio: string;
  week: string;
  scores: Record<string, number>;
  notes: string;
  protocol: string;
}

const emptyDraft: Draft = { weight: '', sleep: '', cardio: '', week: '', scores: {}, notes: '', protocol: '' };

export default function WeeklyCheckinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, PickedPhoto>>>({});
  const [history, setHistory] = useState<HubCheckin[]>([]);
  const [camera, setCamera] = useState<PhotoSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<HubCheckin | null>(null);

  useEffect(() => {
    getCheckins().then(setHistory).catch(() => undefined);
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => raw && setDraft({ ...emptyDraft, ...JSON.parse(raw) }))
      .catch(() => undefined);
  }, []);

  // Save the typed answers on the device as they go (photos are not kept in drafts).
  useEffect(() => {
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => undefined);
  }, [draft]);

  const last = history[0] ?? null;
  const lastWeight = last?.fields.weight_lbs ?? null;
  const weightNum = parseFloat(draft.weight);
  const change = lastWeight != null && Number.isFinite(weightNum) ? weightNum - lastWeight : null;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const pick = async (slot: PhotoSlot) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setPhotos((p) => ({ ...p, [slot]: { uri: a.uri, file: (a as any).file } }));
    }
  };

  const shoot = async (slot: PhotoSlot) => {
    if (Platform.OS === 'web') {
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        setPhotos((p) => ({ ...p, [slot]: { uri: a.uri, file: (a as any).file } }));
      }
      return;
    }
    setCamera(slot);
  };

  const canSubmit = Number.isFinite(weightNum) && weightNum > 50 && POSES.every((p) => photos[p]) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const fields: CheckinFields = {
      weight_lbs: weightNum,
      sleep_hours: parseFloat(draft.sleep) || undefined,
      cardio_minutes: parseFloat(draft.cardio) || undefined,
      training_week: draft.week || undefined,
      scores: draft.scores,
      notes: draft.notes || undefined,
      protocol_notes: draft.protocol || undefined,
    };
    try {
      const saved = await submitCheckin(fields, photos);
      await AsyncStorage.removeItem(DRAFT_KEY);
      setDone(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit. Your answers are saved on this device — try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, styles.doneWrap, { paddingTop: insets.top + spacing.xxxl }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
        <DisplayText size={30}>Check-in sent.</DisplayText>
        <Text style={styles.doneText}>Your coach has been notified and will reply here and by email.</Text>
        <TouchableOpacity style={styles.submit} onPress={() => router.replace('/progress')} accessibilityRole="button">
          <Text style={styles.submitText}>Compare your progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.linkText}>Back to Today</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.draftNote}>Answers save on this phone</Text>
        </View>
        <View style={{ gap: 6 }}>
          <Eyebrow>Show your work</Eyebrow>
          <DisplayText size={32}>Weekly check-in.</DisplayText>
          <Text style={styles.sub}>Fasted, same lighting and the same angle each week.</Text>
        </View>

        <SectionCard eyebrow="01 · Weight" title="Fasted morning weight">
          <TextInput
            value={draft.weight}
            onChangeText={(v) => set({ weight: v.replace(/[^\d.]/g, '') })}
            placeholder="e.g. 186.4"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            style={styles.bigInput}
            accessibilityLabel="Fasted weight in pounds"
          />
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Last check-in</Text>
              <Text style={styles.statValue}>{lastWeight != null ? `${lastWeight}` : '—'}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Change</Text>
              <Text style={[styles.statValue, { color: colors.accentText }]}>
                {change == null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}`}
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard eyebrow="02 · How was the week?" title="Rate 1–10">
          {SCALES.map((sc) => (
            <View key={sc.key} style={{ gap: 8 }}>
              <View style={styles.scaleHead}>
                <Text style={styles.scaleLabel}>{sc.label}</Text>
                <Text style={styles.scaleValue}>{draft.scores[sc.key] ?? '–'}</Text>
              </View>
              <View style={styles.dots}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const on = (draft.scores[sc.key] ?? 0) >= n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.dot, on && styles.dotOn]}
                      onPress={() => set({ scores: { ...draft.scores, [sc.key]: n } })}
                      accessibilityRole="button"
                      accessibilityLabel={`${sc.label} ${n}`}
                    />
                  );
                })}
              </View>
              <View style={styles.scaleHead}>
                <Text style={styles.scaleEnd}>{sc.low}</Text>
                <Text style={styles.scaleEnd}>{sc.high}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard eyebrow="03 · Training & recovery" title="This week's workload">
          <View style={styles.statRow}>
            <Field label="Training week" value={draft.week} onChange={(v) => set({ week: v })} placeholder="e.g. Week 9" />
            <Field label="Sleep · hours" value={draft.sleep} onChange={(v) => set({ sleep: v })} placeholder="7.5" numeric />
          </View>
          <Field label="Cardio · minutes per day" value={draft.cardio} onChange={(v) => set({ cardio: v })} placeholder="35" numeric />
        </SectionCard>

        <SectionCard eyebrow="04 · Protocol (private)" title="Anything you're taking" subtitle="Only you and your coach see this.">
          <TextInput
            value={draft.protocol}
            onChangeText={(v) => set({ protocol: v })}
            placeholder="Current cycle, changes, side effects — or leave blank"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={styles.area}
          />
        </SectionCard>

        <SectionCard eyebrow="05 · Photos" title="Front, side, back" subtitle="The guided camera shows last week's photo so you can line up.">
          <View style={styles.photoRow}>
            {POSES.map((p) => (
              <View key={p} style={styles.photoCol}>
                {photos[p] ? (
                  <TouchableOpacity onPress={() => shoot(p)} accessibilityRole="button" accessibilityLabel={`Retake ${p} photo`}>
                    <Image source={{ uri: photos[p]!.uri }} style={styles.photo} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.photo, styles.photoEmpty]} onPress={() => shoot(p)} accessibilityRole="button" accessibilityLabel={`Take ${p} photo`}>
                    <Ionicons name="camera-outline" size={24} color={colors.accentText} />
                    <Text style={styles.photoLabel}>{p[0].toUpperCase() + p.slice(1)}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => pick(p)} style={styles.libBtn} accessibilityRole="button">
                  <Text style={styles.libText}>Library</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard eyebrow="06 · Notes" title="For your coach">
          <TextInput
            value={draft.notes}
            onChangeText={(v) => set({ notes: v })}
            placeholder="Training, hunger, digestion, wins — anything your coach should know"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={styles.area}
          />
        </SectionCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={[styles.submit, !canSubmit && styles.submitOff]} onPress={submit} disabled={!canSubmit} accessibilityRole="button">
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.submitText}>Submit check-in</Text>}
        </TouchableOpacity>
        {!canSubmit && !busy ? <Text style={styles.need}>Needs your weight and all three photos.</Text> : null}
      </ScrollView>

      <GuidedCamera
        visible={camera !== null}
        pose={camera ?? 'front'}
        ghostUri={camera ? last?.photo_urls[camera] : undefined}
        onClose={() => setCamera(null)}
        onCapture={(uri) => {
          if (camera) setPhotos((p) => ({ ...p, [camera]: { uri } }));
          setCamera(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, numeric }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; numeric?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(numeric ? v.replace(/[^\d.]/g, '') : v)}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  draftNote: { color: colors.textSecondary, fontSize: 12 },
  sub: { color: colors.textSecondary, fontSize: fontSize.sm },
  bigInput: {
    height: 58, borderRadius: 14, borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary, fontFamily: fonts.display, fontSize: 28, paddingHorizontal: spacing.lg,
  },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: spacing.md, gap: 4 },
  statLabel: { color: colors.textSecondary, fontSize: 12 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 20 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: fontSize.md },
  area: { minHeight: 96, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, padding: spacing.md, fontSize: fontSize.sm + 1, textAlignVertical: 'top' },
  scaleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  scaleLabel: { color: colors.textPrimary, fontSize: fontSize.sm + 1, fontWeight: '600', flex: 1 },
  scaleValue: { color: colors.accentText, fontFamily: fonts.display, fontSize: 18 },
  scaleEnd: { color: colors.textSecondary, fontSize: 11 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 32, borderRadius: 8, backgroundColor: colors.borderLight },
  dotOn: { backgroundColor: colors.accent },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photoCol: { flex: 1, gap: 6 },
  photo: { width: '100%', aspectRatio: 0.66, borderRadius: 14, backgroundColor: colors.surfaceSunken },
  photoEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoLabel: { color: colors.accentText, fontSize: 12, fontWeight: '600' },
  libBtn: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  libText: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  error: { color: colors.red, textAlign: 'center' },
  submit: { height: 56, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, alignSelf: 'stretch' },
  submitOff: { opacity: 0.45 },
  submitText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md + 1 },
  need: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  doneWrap: { alignItems: 'center', padding: spacing.xxl, gap: spacing.lg },
  doneText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.textSecondary, fontSize: fontSize.md },
});
