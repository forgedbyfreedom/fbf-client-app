/**
 * Posing clip capture — pick division + pose → record one steady hold → upload.
 * iOS/Android: in-app camera with a 10-second countdown so you can prop the
 * phone and step into frame. Web app: record with the phone's camera or pick a
 * clip. One pose per clip; the coach reviews it and sends written corrections.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { getDivisions, submitPose, Division, PickedClip, POSE_LIBRARY } from '../../lib/posing';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

type Step = 'select' | 'record' | 'uploading' | 'done';
const COUNTDOWN = 10;
const MAX_SECONDS = 30;
const isWeb = Platform.OS === 'web';

export default function PosingCapture() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState('');

  const [divisions, setDivisions] = useState<Division[]>(POSE_LIBRARY);
  const [divKey, setDivKey] = useState<string | null>(null);
  const [poseKey, setPoseKey] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const [clip, setClip] = useState<PickedClip | null>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    getDivisions()
      .then((d) => {
        setDivisions(d);
        setDivKey((prev) => prev ?? d[0]?.key ?? null);
      })
      .catch(() => undefined);
  }, []);

  const activeDiv = divisions.find((d) => d.key === divKey) ?? divisions[0] ?? null;
  const activePose = activeDiv?.poses.find((p) => p.key === poseKey) ?? null;
  const selectReady = !!activeDiv && !!activePose;

  /* ---------- native recording with countdown ---------- */
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      startRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const startRecording = async () => {
    if (!camRef.current) return;
    setRecording(true);
    try {
      const v = await camRef.current.recordAsync({ maxDuration: MAX_SECONDS });
      if (v?.uri) setClip({ uri: v.uri, name: 'posing.mov', type: 'video/quicktime' });
    } catch (e: any) {
      setError(e?.message ?? 'Recording failed.');
    } finally {
      setRecording(false);
    }
  };

  const beginCountdown = async () => {
    setError('');
    if (!perm?.granted) {
      const r = await requestPerm();
      if (!r.granted) {
        setError('Camera access is off. Turn it on in Settings, or choose a clip you already recorded.');
        return;
      }
    }
    setClip(null);
    setCountdown(COUNTDOWN);
  };

  const pickClip = async () => {
    setError('');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1, videoMaxDuration: MAX_SECONDS + 15 });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    setClip({ uri: a.uri, file: (a as any).file, size: a.fileSize ?? (a as any).file?.size ?? null, name: a.fileName ?? 'posing.mp4', type: a.mimeType ?? 'video/mp4' });
  };

  const upload = async () => {
    if (!clip || !divKey || !poseKey) return;
    setError('');
    setStep('uploading');
    try {
      await submitPose(clip, { division: divKey, pose: poseKey, note: note.trim() || undefined });
      setStep('done');
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed. Try again.');
      setStep('record');
    }
  };

  const header = (eyebrow: string, title: string, sub?: string, onBack?: () => void) => (
    <>
      <TouchableOpacity style={styles.back} onPress={onBack ?? (() => router.back())} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={{ gap: 6 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <DisplayText size={32}>{title}</DisplayText>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </>
  );

  /* ---------- select ---------- */
  if (step === 'select') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
          {header('Step 1 of 2', 'Which pose?', 'Pick your division and the pose you want corrected.')}
          <SectionCard eyebrow="Division">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {divisions.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.chip, d.key === activeDiv?.key && styles.chipOn]}
                  onPress={() => { setDivKey(d.key); setPoseKey(null); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: d.key === activeDiv?.key }}
                >
                  <Text style={[styles.chipText, d.key === activeDiv?.key && styles.chipTextOn]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SectionCard>

          <SectionCard eyebrow="Pose" title={activeDiv?.label ?? 'Select a division'}>
            <View style={{ gap: spacing.sm }}>
              {(activeDiv?.poses ?? []).map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.poseOption, p.key === poseKey && styles.poseOptionOn]}
                  onPress={() => setPoseKey(p.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: p.key === poseKey }}
                >
                  <Ionicons name={p.key === poseKey ? 'radio-button-on' : 'radio-button-off'} size={20} color={p.key === poseKey ? colors.accent : colors.textTertiary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.poseLabel}>{p.label}</Text>
                    <Text style={styles.poseTip}>{p.tip}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          <SectionCard eyebrow="Note for your coach" subtitle="Optional — what you want them to look at.">
            <TextInput
              style={styles.note}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Is my back double biceps wide enough?"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </SectionCard>

          <TouchableOpacity style={[styles.primary, !selectReady && styles.off]} disabled={!selectReady} onPress={() => setStep('record')} accessibilityRole="button">
            <Text style={styles.primaryText}>Next: record the pose</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'uploading') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.centerTitle}>Sending to your coach…</Text>
        <Text style={styles.muted}>Keep the app open until this finishes.</Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        <Text style={styles.centerTitle}>Clip sent.</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Your coach gets it now. Their corrections will show up in the Posing Studio.</Text>
        <TouchableOpacity style={[styles.primary, { alignSelf: 'stretch' }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/posing'))} accessibilityRole="button">
          <Text style={styles.primaryText}>Back to Posing Studio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- record ---------- */
  const uploadBar = clip ? (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.readyRow}>
        <Ionicons name="checkmark-circle" size={20} color={colors.green} />
        <Text style={styles.readyText}>Clip ready{clip.size ? ` · ${Math.round(clip.size / 1048576)} MB` : ''}</Text>
      </View>
      <TouchableOpacity style={styles.primary} onPress={upload} accessibilityRole="button">
        <Text style={styles.primaryText}>Send to coach</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const errorBox = error ? <Text style={styles.error}>{error}</Text> : null;

  if (isWeb) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]}>
        {header('Step 2 of 2', `Record: ${activePose?.label ?? 'your pose'}`, 'On your phone, tap below and choose “Take Video”. Prop the phone at hip height, step back, and hold the pose.', () => setStep('select'))}
        {activePose ? (
          <SectionCard eyebrow="Hold it like this" subtitle={activePose.tip} />
        ) : null}
        <TouchableOpacity style={styles.upload} onPress={pickClip} accessibilityRole="button">
          <Ionicons name="videocam-outline" size={30} color={colors.accentText} />
          <Text style={styles.uploadText}>{clip ? 'Choose a different clip' : 'Record or choose a clip'}</Text>
          <Text style={styles.muted}>10–20 seconds · one pose</Text>
        </TouchableOpacity>
        {errorBox}
        {uploadBar}
      </ScrollView>
    );
  }

  return (
    <View style={styles.camWrap}>
      {perm?.granted ? (
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" mode="video" mute />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSunken }]} />
      )}
      <View style={[styles.camTop, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.back} onPress={() => (recording ? camRef.current?.stopRecording() : setStep('select'))} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {recording ? `● ${elapsed}s — hold the pose` : countdown !== null ? 'Step into frame' : clip ? 'Clip captured' : activePose ? `Pose: ${activePose.label}` : 'Prop the phone, then Record'}
          </Text>
        </View>
      </View>

      {countdown !== null ? (
        <View style={styles.countWrap} pointerEvents="none">
          <Text style={styles.countNum}>{countdown}</Text>
        </View>
      ) : null}

      <View style={[styles.camBottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        {errorBox}
        {!recording && countdown === null ? uploadBar : null}
        <View style={styles.camButtons}>
          {recording ? (
            <TouchableOpacity style={[styles.primary, styles.stop]} onPress={() => camRef.current?.stopRecording()} accessibilityRole="button">
              <Text style={[styles.primaryText, { color: colors.textPrimary }]}>Stop</Text>
            </TouchableOpacity>
          ) : countdown !== null ? (
            <TouchableOpacity style={styles.secondaryDark} onPress={() => setCountdown(null)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.primary, { flex: 1 }]} onPress={beginCountdown} accessibilityRole="button">
                <Ionicons name="radio-button-on" size={18} color={colors.onAccent} />
                <Text style={styles.primaryText}>{clip ? 'Re-record' : `Record (${COUNTDOWN}s timer)`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryDark} onPress={pickClip} accessibilityRole="button" accessibilityLabel="Choose a clip">
                <Ionicons name="images-outline" size={20} color={colors.accentText} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 21 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.accentText, fontWeight: '600' },
  secondaryDark: { minHeight: 52, minWidth: 52, paddingHorizontal: spacing.lg, borderRadius: 14, borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: 'rgba(10,10,11,0.75)', alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.45 },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: { paddingHorizontal: spacing.md, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  chipOn: { borderColor: colors.borderAccent, backgroundColor: '#2A2414' },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  chipTextOn: { color: colors.accentText },
  poseOption: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSunken },
  poseOptionOn: { borderColor: colors.borderAccent },
  poseLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSize.md },
  poseTip: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  note: { minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, padding: spacing.md, fontSize: fontSize.md, textAlignVertical: 'top' },
  upload: { minHeight: 150, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderAccent, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadText: { color: colors.accentText, fontWeight: '700', fontSize: fontSize.md },
  muted: { color: colors.textSecondary },
  error: { color: colors.yellow, fontSize: fontSize.sm, lineHeight: 19 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyText: { color: colors.textPrimary, fontWeight: '600' },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  centerTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 28 },
  camWrap: { flex: 1, backgroundColor: '#000' },
  camTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: { flex: 1, minHeight: 40, borderRadius: 20, backgroundColor: 'rgba(10,10,11,0.75)', justifyContent: 'center', paddingHorizontal: spacing.md },
  pillText: { color: colors.textPrimary, fontWeight: '600' },
  countWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  countNum: { color: colors.accent, fontFamily: fonts.display, fontSize: 140, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 12 },
  camBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.md, backgroundColor: 'rgba(10,10,11,0.55)', paddingTop: spacing.md },
  camButtons: { flexDirection: 'row', gap: spacing.sm },
  stop: { flex: 1, backgroundColor: colors.red },
});
