/**
 * Body scan capture — prep → numbers → record one slow turn → upload.
 * iOS/Android: in-app camera with a 10-second countdown so you can prop the
 * phone and step back. Web app: record with the phone's camera or pick a video.
 *
 * Capture standard (FBF protocol): fitted underwear or nothing, phone at hip
 * height 6–8 ft away, arms slightly out, one slow full turn in 12–20 seconds.
 * The raw video is deleted by the server after processing.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { submitScan, maxUploadBytes, PaymentRequiredError, PickedVideo, ScanIntake } from '../../lib/bodyscan';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

type Step = 'prep' | 'numbers' | 'record' | 'uploading' | 'done';
const INTAKE_KEY = 'fbf_bodyscan_intake_v1';
const COUNTDOWN = 10;
const MAX_SECONDS = 20;
const isWeb = Platform.OS === 'web';

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? undefined : n;
};

export default function BodyScanCapture() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<Step>('prep');
  const [error, setError] = useState('');
  const [payUrl, setPayUrl] = useState<string | null>(null);

  // numbers
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [age, setAge] = useState('');
  const [ft, setFt] = useState('');
  const [inch, setInch] = useState('');
  const [weight, setWeight] = useState('');
  const [tape, setTape] = useState<Record<string, string>>({});

  // video
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(INTAKE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const j = JSON.parse(raw);
        if (j.sex) setSex(j.sex);
        if (j.age) setAge(String(j.age));
        if (j.height_in) {
          setFt(String(Math.floor(j.height_in / 12)));
          setInch(String(Math.round((j.height_in % 12) * 10) / 10));
        }
      } catch {}
    });
  }, []);

  const heightIn = (num(ft) ?? 0) * 12 + (num(inch) ?? 0);
  const numbersReady = !!sex && heightIn > 48 && (num(weight) ?? 0) > 60;

  const TAPE: { key: keyof ScanIntake; label: string; show?: boolean }[] = [
    { key: 'waist_in', label: 'Waist at navel' },
    { key: 'neck_in', label: 'Neck' },
    { key: 'hips_in', label: 'Hips (widest)', show: sex === 'female' },
    { key: 'chest_in', label: 'Chest' },
    { key: 'arm_in', label: 'Arm (flexed)' },
    { key: 'thigh_in', label: 'Thigh' },
  ];

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
      if (v?.uri) setVideo({ uri: v.uri, name: 'scan.mov', type: 'video/quicktime' });
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
        setError('Camera access is off. Turn it on in Settings, or choose a video you already recorded.');
        return;
      }
    }
    setVideo(null);
    setCountdown(COUNTDOWN);
  };

  const pickVideo = async () => {
    setError('');
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: MAX_SECONDS + 10,
    });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    if (a.duration && a.duration > 45000) {
      setError('That video is longer than 45 seconds. One slow turn takes 12–20 seconds.');
      return;
    }
    setVideo({ uri: a.uri, file: (a as any).file, size: a.fileSize ?? (a as any).file?.size ?? null, name: a.fileName ?? 'scan.mp4', type: a.mimeType ?? 'video/mp4' });
  };

  const upload = async () => {
    if (!video || !sex) return;
    setError('');
    setPayUrl(null);
    const limit = await maxUploadBytes();
    if (limit && video.size && video.size > limit) {
      setError(`That video is ${Math.round(video.size / 1048576)} MB; the limit is ${Math.round(limit / 1048576)} MB. Record a shorter turn.`);
      return;
    }
    const intake: ScanIntake = { sex, age: num(age), height_in: Math.round(heightIn * 10) / 10, weight_lb: num(weight)! };
    for (const t of TAPE) {
      const v = num(tape[t.key as string] ?? '');
      if (v && (t.show ?? true)) (intake as any)[t.key] = v;
    }
    AsyncStorage.setItem(INTAKE_KEY, JSON.stringify({ sex, age: intake.age, height_in: intake.height_in })).catch(() => undefined);
    setStep('uploading');
    try {
      await submitScan(video, intake);
      setStep('done');
    } catch (e: any) {
      if (e instanceof PaymentRequiredError) {
        setPayUrl(e.paymentUrl || null);
        setError(e.message);
      } else {
        setError(e?.message ?? 'Upload failed. Try again.');
      }
      setStep('record');
    }
  };

  /* ---------- screens ---------- */
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

  if (step === 'prep') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]}>
        {header('Step 1 of 3', 'Before you scan.')}
        <SectionCard eyebrow="Setup" title="Get these right">
          {[
            ['shirt-outline', 'Fitted underwear or nothing. Loose clothing ruins the read.'],
            ['phone-portrait-outline', 'Prop the phone at hip height, 6–8 feet away, whole body in frame.'],
            ['body-outline', 'Arms slightly away from your sides. One slow full turn, 12–20 seconds.'],
            ['sunny-outline', 'Even light, same spot and time each scan so trends are real.'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.tip}>
              <Ionicons name={icon as any} size={20} color={colors.accentText} />
              <Text style={styles.tipText}>{text}</Text>
            </View>
          ))}
        </SectionCard>
        <SectionCard eyebrow="Privacy" subtitle="Your video is used only to compute your measurements and is deleted automatically after processing. Only the numbers and your report are kept. You must be 18 or older." />
        <TouchableOpacity style={styles.primary} onPress={() => setStep('numbers')} accessibilityRole="button">
          <Text style={styles.primaryText}>I understand — continue</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'numbers') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
          {header('Step 2 of 3', 'Your numbers.', undefined, () => setStep('prep'))}
          <SectionCard eyebrow="Required">
            <View style={styles.segment}>
              {(['male', 'female'] as const).map((s) => (
                <TouchableOpacity key={s} style={[styles.segBtn, sex === s && styles.segOn]} onPress={() => setSex(s)} accessibilityRole="button" accessibilityState={{ selected: sex === s }}>
                  <Text style={[styles.segText, sex === s && styles.segTextOn]}>{s === 'male' ? 'Male' : 'Female'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.fieldRow}>
              <Field label="Height (ft)" value={ft} onChange={setFt} />
              <Field label="(in)" value={inch} onChange={setInch} />
              <Field label="Weight (lb)" value={weight} onChange={setWeight} />
            </View>
            <View style={styles.fieldRow}>
              <Field label="Age" value={age} onChange={setAge} />
              <View style={{ flex: 2 }} />
            </View>
          </SectionCard>
          <SectionCard eyebrow="Tape measure · optional" subtitle="Inches. The tape anchors the video, so every measurement you add sharpens the result. Waist and neck matter most.">
            <View style={styles.tapeGrid}>
              {TAPE.filter((t) => t.show ?? true).map((t) => (
                <Field key={t.key as string} label={t.label} value={tape[t.key as string] ?? ''} onChange={(v) => setTape((p) => ({ ...p, [t.key as string]: v }))} half />
              ))}
            </View>
          </SectionCard>
          <TouchableOpacity style={[styles.primary, !numbersReady && styles.off]} disabled={!numbersReady} onPress={() => setStep('record')} accessibilityRole="button">
            <Text style={styles.primaryText}>Next: record your turn</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'uploading') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.centerTitle}>Uploading your scan…</Text>
        <Text style={styles.muted}>Keep the app open until this finishes.</Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
        <Text style={styles.centerTitle}>Scan received.</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Processing usually takes a few minutes. Your result will show on the body scan screen.</Text>
        <TouchableOpacity style={[styles.primary, { alignSelf: 'stretch' }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/bodyscan'))} accessibilityRole="button">
          <Text style={styles.primaryText}>Back to body scan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* record */
  const uploadBar = video ? (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.readyRow}>
        <Ionicons name="checkmark-circle" size={20} color={colors.green} />
        <Text style={styles.readyText}>
          Video ready{video.size ? ` · ${Math.round(video.size / 1048576)} MB` : ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.primary} onPress={upload} accessibilityRole="button">
        <Text style={styles.primaryText}>Upload scan</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const errorBox = error ? (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.error}>{error}</Text>
      {payUrl ? (
        <TouchableOpacity style={styles.secondary} onPress={() => Linking.openURL(payUrl)} accessibilityRole="button">
          <Text style={styles.secondaryText}>Pay for a scan</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : null;

  if (isWeb) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]}>
        {header('Step 3 of 3', 'Record one slow turn.', 'On your phone, tap below and choose “Take Video”. Prop the phone at hip height, step back, and turn once slowly.', () => setStep('numbers'))}
        <TouchableOpacity style={styles.upload} onPress={pickVideo} accessibilityRole="button">
          <Ionicons name="videocam-outline" size={30} color={colors.accentText} />
          <Text style={styles.uploadText}>{video ? 'Choose a different video' : 'Record or choose video'}</Text>
          <Text style={styles.muted}>12–20 seconds · one full turn</Text>
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
        <TouchableOpacity style={styles.back} onPress={() => (recording ? camRef.current?.stopRecording() : setStep('numbers'))} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {recording ? `● ${elapsed}s — turn slowly` : countdown !== null ? 'Step back into frame' : video ? 'Recording captured' : 'Prop the phone, then tap Record'}
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
                <Text style={styles.primaryText}>{video ? 'Re-record' : `Record (${COUNTDOWN}s timer)`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryDark} onPress={pickVideo} accessibilityRole="button" accessibilityLabel="Choose a video">
                <Ionicons name="images-outline" size={20} color={colors.accentText} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, half }: { label: string; value: string; onChange: (v: string) => void; half?: boolean }) {
  return (
    <View style={[{ flex: 1, gap: 4 }, half && { flexBasis: '47%', flexGrow: 0 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sub: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 21 },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: 4 },
  tipText: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 21 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  secondaryDark: { minHeight: 52, minWidth: 52, paddingHorizontal: spacing.lg, borderRadius: 14, borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: 'rgba(10,10,11,0.75)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.accentText, fontWeight: '600' },
  off: { opacity: 0.45 },
  segment: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#2A2414' },
  segText: { color: colors.textSecondary, fontWeight: '600' },
  segTextOn: { color: colors.accentText },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  tapeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fieldLabel: { color: colors.textSecondary, fontSize: 12 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: fontSize.lg, fontFamily: fonts.display },
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
