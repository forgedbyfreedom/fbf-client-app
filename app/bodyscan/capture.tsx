/**
 * BodyScan capture — guided 360° recording, measurement entry, upload.
 * Standalone route (/bodyscan/capture); no existing screens link here yet.
 *
 * Capture standard (per FBF protocol):
 *  - fitted underwear or nothing, for accuracy
 *  - phone propped at hip height, 6–8 ft away
 *  - arms slightly out (A-pose), one slow full turn, 12–20 seconds
 *  - raw video is deleted automatically after processing (privacy)
 */

import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Linking, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { PaymentRequiredError, submitScan } from '../../lib/bodyscan';

const GOLD = '#e3b04b';
const BG = '#0d0f12';
const CARD = '#16191e';

type Step = 'consent' | 'form' | 'record' | 'uploading' | 'done';

export default function BodyScanCapture() {
  const [step, setStep] = useState<Step>('consent');
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const camRef = useRef<CameraView>(null);
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [age, setAge] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLb, setWeightLb] = useState('');
  const [waistIn, setWaistIn] = useState('');
  const [neckIn, setNeckIn] = useState('');
  const [hipsIn, setHipsIn] = useState('');

  const startRecording = async () => {
    if (!camPerm?.granted) { await requestCamPerm(); return; }
    if (!micPerm?.granted) { await requestMicPerm(); }
    if (!camRef.current) return;
    setRecording(true);
    try {
      const video = await camRef.current.recordAsync({ maxDuration: 25 });
      if (video?.uri) setVideoUri(video.uri);
    } finally {
      setRecording(false);
    }
  };

  const stopRecording = () => camRef.current?.stopRecording();

  const upload = async () => {
    if (!videoUri || !sex) return;
    setStep('uploading');
    try {
      await submitScan(videoUri, {
        sex,
        age: age ? Number(age) : undefined,
        height_in: Number(heightIn),
        weight_lb: Number(weightLb),
        waist_in: waistIn ? Number(waistIn) : undefined,
        neck_in: neckIn ? Number(neckIn) : undefined,
        hips_in: hipsIn ? Number(hipsIn) : undefined,
      });
      setStep('done');
    } catch (e: any) {
      if (e instanceof PaymentRequiredError) {
        const buttons: any[] = [
          { text: 'Cancel', style: 'cancel', onPress: () => setStep('record') },
        ];
        if (e.paymentUrl) {
          buttons.push({ text: `Pay $${e.priceUsd}`, onPress: () => Linking.openURL(e.paymentUrl) });
        }
        Alert.alert('Payment needed', e.message, buttons);
      } else {
        Alert.alert('Upload failed', e?.message ?? 'Try again.');
      }
      setStep('record');
    }
  };

  if (step === 'consent') {
    return (
      <ScrollView style={st.root} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
        <Text style={st.h1}>Before you scan</Text>
        <View style={st.card}>
          <Text style={st.li}>• Wear fitted underwear or nothing — accuracy depends on seeing your real shape. Loose clothing ruins the scan.</Text>
          <Text style={st.li}>• Prop your phone at hip height, stand 6–8 feet away, full body in frame.</Text>
          <Text style={st.li}>• Arms slightly away from your sides. One slow full turn, 12–20 seconds.</Text>
          <Text style={st.li}>• Good, even lighting. Same conditions every scan for best trend data.</Text>
        </View>
        <View style={st.card}>
          <Text style={st.liStrong}>Privacy: your video is used only to compute your measurements and is automatically deleted after processing. Only the numbers and your report are kept. You must be 18 or older.</Text>
        </View>
        <TouchableOpacity style={st.cta} onPress={() => setStep('form')}>
          <Text style={st.ctaText}>I understand — continue</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'form') {
    const ready = sex && Number(heightIn) > 0 && Number(weightLb) > 0;
    return (
      <KeyboardAvoidingView
        style={st.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
          <Text style={st.h1}>Your numbers</Text>
          <View style={st.sexRow}>
            {(['male', 'female'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[st.sexBtn, sex === s && st.sexBtnOn]}
                onPress={() => setSex(s)}
              >
                <Text style={[st.sexTxt, sex === s && st.sexTxtOn]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Age" value={age} onChange={setAge} />
          <Field label="Height (inches) *" value={heightIn} onChange={setHeightIn} />
          <Field label="Weight (lbs) *" value={weightLb} onChange={setWeightLb} />
          <Text style={st.sub}>
            Optional tape measurements sharpen the estimate (tape beats the scan
            when both exist):
          </Text>
          <Field label="Waist at navel (in)" value={waistIn} onChange={setWaistIn} />
          <Field label="Neck (in)" value={neckIn} onChange={setNeckIn} />
          {sex === 'female' && (
            <Field label="Hips (in)" value={hipsIn} onChange={setHipsIn} />
          )}
          <TouchableOpacity
            style={[st.cta, !ready && { opacity: 0.4 }]}
            disabled={!ready}
            onPress={() => setStep('record')}
          >
            <Text style={st.ctaText}>Next: record your turn</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'record') {
    return (
      <View style={st.root}>
        <CameraView ref={camRef} style={{ flex: 1 }} facing="back" mode="video" />
        <View style={st.overlay}>
          <Text style={st.overlayTxt}>
            {recording
              ? 'Turn slowly… one full rotation'
              : videoUri
                ? 'Recording captured'
                : 'Prop the phone, step back 6–8 ft, then tap record'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {!recording && (
              <TouchableOpacity style={st.recBtn} onPress={startRecording}>
                <Text style={st.ctaText}>{videoUri ? 'Re-record' : 'Record'}</Text>
              </TouchableOpacity>
            )}
            {recording && (
              <TouchableOpacity style={[st.recBtn, { backgroundColor: '#c0392b' }]} onPress={stopRecording}>
                <Text style={[st.ctaText, { color: '#fff' }]}>Stop</Text>
              </TouchableOpacity>
            )}
            {videoUri && !recording && (
              <TouchableOpacity style={st.recBtn} onPress={upload}>
                <Text style={st.ctaText}>Upload scan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (step === 'uploading') {
    return (
      <View style={[st.root, st.center]}>
        <Text style={st.h1}>Uploading…</Text>
        <Text style={st.sub}>Don't close the app.</Text>
      </View>
    );
  }

  return (
    <View style={[st.root, st.center]}>
      <Text style={st.h1}>Scan submitted 💪</Text>
      <Text style={[st.sub, { textAlign: 'center', paddingHorizontal: 32 }]}>
        Processing takes a few minutes. You'll get an email when your report is
        ready, and it will appear in your scan history.
      </Text>
      <TouchableOpacity style={st.cta} onPress={() => router.back()}>
        <Text style={st.ctaText}>Back to BodyScan</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, value, onChange }:
  { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={st.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholderTextColor="#555"
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  h1: { color: GOLD, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  sub: { color: '#9aa0a6', marginVertical: 10 },
  card: {
    backgroundColor: CARD, borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#2a2f36',
  },
  li: { color: '#e8e8e8', marginBottom: 8, lineHeight: 20 },
  liStrong: { color: GOLD, lineHeight: 20 },
  cta: {
    backgroundColor: GOLD, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 12,
  },
  ctaText: { color: '#111', fontWeight: '800', fontSize: 16 },
  sexRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sexBtn: {
    flex: 1, borderWidth: 1, borderColor: '#2a2f36', borderRadius: 10,
    padding: 12, alignItems: 'center', backgroundColor: CARD,
  },
  sexBtnOn: { backgroundColor: GOLD, borderColor: GOLD },
  sexTxt: { color: '#e8e8e8', fontWeight: '700', textTransform: 'capitalize' },
  sexTxtOn: { color: '#111' },
  fieldLabel: { color: '#9aa0a6', marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1,
    borderColor: '#2a2f36', color: '#fff', padding: 12, fontSize: 16,
  },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20,
    paddingBottom: 44, backgroundColor: 'rgba(13,15,18,0.85)',
    alignItems: 'center', gap: 12,
  },
  overlayTxt: { color: '#fff', fontSize: 15, textAlign: 'center' },
  recBtn: {
    backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 22, alignItems: 'center',
  },
});
