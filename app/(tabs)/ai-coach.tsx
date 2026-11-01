import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SectionCard, Eyebrow, DisplayText } from '../../components/ui/SectionCard';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { generateSpeech, playAudio } from '../../lib/elevenlabs';
import { VOICE_IDS, type VoicePreference } from './profile';
import { getToken, wpApiRoot } from '../../lib/wp-auth';
import { extractBloodwork, getBloodworkHistory, getAiStats, AiStats, LabReport, LabMarker } from '../../lib/hub';

const SAMPLE_QUESTIONS = [
  'How is my progress this week?',
  'Should I adjust my macros?',
  'Am I training enough?',
  'FBF Recomp Protocol',
  'What is Retatrutide?',
  'Progressive overload',
  'Healing peptides',
  'PCT protocol',
];

type Tab = 'ask' | 'bloodwork';

/** FBF AI Coach (WordPress App Bridge → fbf-rag). Non-streaming; returns the full reply. */
async function askCoach(question: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const token = await getToken();
    const res = await fetch(`${wpApiRoot}/coach/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ message: question }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error(data?.message || `Coach unavailable (${res.status}). Try again in a minute.`);
    return data.reply || 'No answer returned.';
  } finally {
    clearTimeout(timeout);
  }
}

const markerLine = (m: LabMarker) =>
  `${m.name}: ${m.value}${m.unit ? ' ' + m.unit : ''}` +
  (m.ref_text ? ` (ref ${m.ref_text})` : m.ref_low != null || m.ref_high != null ? ` (ref ${m.ref_low ?? ''}–${m.ref_high ?? ''})` : '') +
  (m.flag && m.flag !== 'normal' ? ` [${m.flag.toUpperCase()}]` : '');

const formatPassages = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

export default function AICoachScreen() {
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>('ask');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AiStats | null>(null);
  const [speaking, setSpeaking] = useState<'idle' | 'generating' | 'playing'>('idle');
  const [voicePref, setVoicePref] = useState<VoicePreference>('male');
  const playerRef = useRef<AudioPlayer | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Bloodwork
  const [reading, setReading] = useState(false);
  const [report, setReport] = useState<LabReport | null>(null);
  const [labError, setLabError] = useState<string | null>(null);
  const [history, setHistory] = useState<LabReport[]>([]);
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    getAiStats().then(setStats);
    getBloodworkHistory().then(setHistory).catch(() => undefined);
    AsyncStorage.getItem('fbf_voice_preference').then((v) => {
      if (v === 'male' || v === 'female') setVoicePref(v);
    });
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  const resetVoice = () => {
    playerRef.current?.remove();
    playerRef.current = null;
    setSpeaking('idle');
  };

  const run = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    resetVoice();
    try {
      const reply = await askCoach(q);
      setAnswer(reply);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e: any) {
      Alert.alert('AI Coach', e.message || 'Failed to get a response.');
    } finally {
      setLoading(false);
    }
  };

  const analyze = (markers: LabMarker[], when?: string | null) => {
    const lines = markers.map(markerLine).join('\n');
    run(
      `Please analyze my bloodwork${when ? ` (collected ${when})` : ''}. For each marker give the value, the standard lab range, the acceptable range for an enhanced athlete, and your assessment (normal / watch / intervene / red flag). Flag anything concerning, explain which compounds could cause the abnormal values, and give the intervention ladder (lifestyle > supplements with doses > pharmaceuticals with doses > discontinuation thresholds).\n\n${lines}`
    );
  };

  const pickLabs = async () => {
    setLabError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: false, copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const type = a.mimeType || (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      setReading(true);
      setReport(null);
      const r = await extractBloodwork({ uri: a.uri, name: a.name, type, file: (a as any).file });
      setReport(r);
      setHistory((h) => [r, ...h.filter((x) => x.id !== r.id)]);
      if (r.markers.length === 0) setLabError("That file didn't look like a lab report. Try the PDF from your lab, or a clear photo of the results page.");
    } catch (e: any) {
      setLabError(e.message || 'Could not read that file.');
    } finally {
      setReading(false);
    }
  };

  const speak = async () => {
    if (!answer) return;
    if (playerRef.current) {
      if (speaking === 'playing') {
        playerRef.current.pause();
        setSpeaking('idle');
      } else {
        playerRef.current.play();
        setSpeaking('playing');
      }
      return;
    }
    setSpeaking('generating');
    try {
      const uri = await generateSpeech(answer.length > 5000 ? answer.slice(0, 5000) + '…' : answer, VOICE_IDS[voicePref]);
      const player = await playAudio(uri);
      playerRef.current = player;
      setSpeaking('playing');
      player.addListener('playbackStatusUpdate', (s) => {
        if (s.playing === false && s.duration > 0 && s.currentTime >= s.duration) setSpeaking('idle');
      });
    } catch (e: any) {
      setSpeaking('idle');
      Alert.alert('Voice', e.message || 'Failed to generate speech.');
    }
  };

  const flagged = report ? report.markers.filter((m) => m.flag === 'high' || m.flag === 'low') : [];
  const normal = report ? report.markers.filter((m) => !(m.flag === 'high' || m.flag === 'low')) : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Eyebrow>FBF AI Coach</Eyebrow>
          <DisplayText size={34}>Ask anything.</DisplayText>
          <Text style={styles.stats}>
            {stats
              ? `${stats.sources} expert sources · ${stats.words} words${stats.passages ? ` · ${formatPassages(stats.passages)} passages searched` : ''}`
              : 'Grounded in our expert library, with sources.'}
          </Text>
        </View>

        <View style={styles.segment}>
          {(['ask', 'bloodwork'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segBtn, tab === t && styles.segOn]}
              onPress={() => setTab(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t }}
            >
              <Ionicons name={t === 'ask' ? 'chatbubble-outline' : 'flask-outline'} size={15} color={tab === t ? colors.accentText : colors.textSecondary} />
              <Text style={[styles.segText, tab === t && styles.segTextOn]}>{t === 'ask' ? 'Ask' : 'Bloodwork'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'ask' ? (
          <SectionCard>
            <TextInput
              style={styles.input}
              placeholder="Training, nutrition, peptides, protocols…"
              placeholderTextColor={colors.textTertiary}
              value={question}
              onChangeText={setQuestion}
              multiline
              accessibilityLabel="Your question"
            />
            {desktop ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {SAMPLE_QUESTIONS.map((q) => (
                  <TouchableOpacity key={q} style={styles.chip} onPress={() => setQuestion(q)} accessibilityRole="button">
                    <Text style={styles.chipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {SAMPLE_QUESTIONS.map((q) => (
                  <TouchableOpacity key={q} style={styles.chip} onPress={() => setQuestion(q)} accessibilityRole="button">
                    <Text style={styles.chipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.primary, (!question.trim() || loading) && styles.off]}
              onPress={() => run(question)}
              disabled={!question.trim() || loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>Ask Coach Bryan</Text>}
            </TouchableOpacity>
          </SectionCard>
        ) : (
          <>
            <SectionCard eyebrow="Upload" title="Read my lab report" subtitle="PDF from your lab, or a clear photo. We pull out every marker and flag what's out of range.">
              <TouchableOpacity style={styles.upload} onPress={pickLabs} disabled={reading} accessibilityRole="button">
                {reading ? (
                  <>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.uploadText}>Reading your report…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={26} color={colors.accentText} />
                    <Text style={styles.uploadText}>Choose PDF or photo</Text>
                  </>
                )}
              </TouchableOpacity>
              {labError ? <Text style={styles.error}>{labError}</Text> : null}
            </SectionCard>

            {report && report.markers.length > 0 ? (
              <SectionCard
                eyebrow={report.lab ?? 'Results'}
                title={`${report.markers.length} markers · ${flagged.length} out of range`}
                subtitle={report.collected_on ? `Collected ${report.collected_on}` : undefined}
                highlight
              >
                {[...flagged, ...normal].map((m, i) => (
                  <View key={i} style={styles.labRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labName}>{m.name}</Text>
                      <Text style={styles.labRef}>
                        {m.ref_text ?? (m.ref_low != null || m.ref_high != null ? `${m.ref_low ?? ''}–${m.ref_high ?? ''}` : '')}
                      </Text>
                    </View>
                    <Text style={[styles.labVal, m.flag === 'high' && { color: colors.yellow }, m.flag === 'low' && { color: colors.blue }]}>
                      {m.value} {m.unit ?? ''} {m.flag === 'high' ? '↑' : m.flag === 'low' ? '↓' : ''}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity style={[styles.primary, loading && styles.off]} onPress={() => analyze(report.markers, report.collected_on)} disabled={loading} accessibilityRole="button">
                  {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>Analyze with Coach Bryan</Text>}
                </TouchableOpacity>
              </SectionCard>
            ) : null}

            <SectionCard eyebrow="Or type it" title="Paste results">
              <TextInput
                style={[styles.input, { minHeight: 120 }]}
                placeholder={'Testosterone Total: 856 ng/dL\nEstradiol: 42 pg/mL\nHematocrit: 51.2%'}
                placeholderTextColor={colors.textTertiary}
                value={pasted}
                onChangeText={setPasted}
                multiline
              />
              <TouchableOpacity
                style={[styles.secondary, (!pasted.trim() || loading) && styles.off]}
                onPress={() =>
                  run(
                    `Please analyze my bloodwork. For each marker give the value, standard lab range, enhanced-athlete range and your assessment (normal / watch / intervene / red flag), the compounds that could cause abnormal values, and the intervention ladder.\n\n${pasted.trim()}`
                  )
                }
                disabled={!pasted.trim() || loading}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>Analyze pasted results</Text>
              </TouchableOpacity>
            </SectionCard>

            {history.length > (report ? 1 : 0) ? (
              <SectionCard eyebrow="History" title="Past reports">
                {history
                  .filter((h) => h.id !== report?.id)
                  .slice(0, 8)
                  .map((h) => (
                    <TouchableOpacity key={h.id} style={styles.histRow} onPress={() => setReport(h)} accessibilityRole="button">
                      <Text style={styles.histTitle}>{h.collected_on ?? h.uploaded_at.slice(0, 10)}</Text>
                      <Text style={styles.histMeta}>
                        {h.markers.length} markers · {h.markers.filter((m) => m.flag === 'high' || m.flag === 'low').length} flagged
                      </Text>
                    </TouchableOpacity>
                  ))}
              </SectionCard>
            ) : null}
          </>
        )}

        {(answer || loading) && (
          <SectionCard
            eyebrow="Coach Bryan"
            right={
              answer ? (
                <TouchableOpacity onPress={speak} style={styles.listen} disabled={speaking === 'generating'} accessibilityRole="button">
                  {speaking === 'generating' ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Ionicons name={speaking === 'playing' ? 'pause' : 'volume-high'} size={18} color={colors.accentText} />
                  )}
                  <Text style={styles.listenText}>{speaking === 'playing' ? 'Pause' : 'Listen'}</Text>
                </TouchableOpacity>
              ) : undefined
            }
          >
            {loading ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.muted}>Searching the library…</Text>
              </View>
            ) : (
              <Text style={styles.answer} selectable>
                {answer}
              </Text>
            )}
          </SectionCard>
        )}

        <Text style={styles.disclaimer}>
          Educational and research purposes only. Not medical advice. Consult a physician before making health changes.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md + 2 },
  stats: { color: colors.textSecondary, fontSize: fontSize.sm },
  segment: { flexDirection: 'row', gap: 6, backgroundColor: colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#2A2414' },
  segText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm + 1 },
  segTextOn: { color: colors.accentText },
  input: {
    minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary, padding: spacing.md, fontSize: fontSize.md, textAlignVertical: 'top',
  },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.borderLight, justifyContent: 'center' },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  secondary: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.accentText, fontWeight: '600', fontSize: fontSize.md },
  off: { opacity: 0.5 },
  upload: { minHeight: 96, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderAccent, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadText: { color: colors.accentText, fontWeight: '600' },
  error: { color: colors.yellow, fontSize: fontSize.sm },
  labRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  labName: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '600' },
  labRef: { color: colors.textSecondary, fontSize: 11 },
  labVal: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 16 },
  histRow: { minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  histTitle: { color: colors.textPrimary, fontWeight: '600' },
  histMeta: { color: colors.textSecondary, fontSize: 12 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.borderAccent },
  listenText: { color: colors.accentText, fontWeight: '600', fontSize: 13 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  muted: { color: colors.textSecondary },
  answer: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 23 },
  disclaimer: { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
