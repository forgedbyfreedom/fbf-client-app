import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { generateSpeech, playAudio } from '../../lib/elevenlabs';
import { apiUpload } from '../../lib/api';
import { BrandHeader } from '../../components/ui/BrandHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { VOICE_IDS, type VoicePreference } from './profile';

const AI_API_BASE = process.env.EXPO_PUBLIC_AI_API_URL || 'https://forged-by-freedom-api-nm4f.onrender.com';

const SAMPLE_QUESTIONS = [
  'How is my progress this week?',
  'Should I adjust my macros?',
  'Am I training enough?',
  'FBF Recomp Protocol',
  'What is Retatrutide?',
  'Progressive Overload',
  'Healing Peptides',
  'PCT Protocol',
];

type Tab = 'ask' | 'bloodwork';

async function askCoach(question: string, clientId?: string): Promise<string> {
  // Try context-aware endpoint first, fall back to generic
  try {
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 60000);
    const res = await fetch(`${AI_API_BASE}/api/coach-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, client_id: clientId }),
      signal: controller1.signal,
    });
    clearTimeout(timeout1);
    const data = await res.json();
    if (data.reply) return data.reply;
  } catch (err) {
    console.log('coach-chat failed, trying /ask fallback:', err);
  }

  // Fallback to generic /ask
  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 60000);
  const res = await fetch(`${AI_API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal: controller2.signal,
  });
  clearTimeout(timeout2);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.answer || 'No answer returned.';
}

export default function AICoachScreen() {
  const insets = useSafeAreaInsets();
  const { client } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('ask');
  const [question, setQuestion] = useState('');
  const [bloodwork, setBloodwork] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingState, setSpeakingState] = useState<'idle' | 'generating' | 'playing'>('idle');
  const playerRef = useRef<AudioPlayer | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [bloodworkFiles, setBloodworkFiles] = useState<{ name: string; uri: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [voicePref, setVoicePref] = useState<VoicePreference>('male');

  useEffect(() => {
    AsyncStorage.getItem('fbf_voice_preference').then((val) => {
      if (val === 'male' || val === 'female') setVoicePref(val);
    });
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  const handleAsk = async () => {
    const q = activeTab === 'ask' ? question.trim() : '';
    if (activeTab === 'ask' && !q) return;

    if (activeTab === 'bloodwork' && !bloodwork.trim() && bloodworkFiles.length === 0) {
      Alert.alert('Missing Data', 'Please paste your results or attach a file.');
      return;
    }

    // Upload bloodwork files if any (native only — web preview skips upload)
    let fileUrls: string[] = [];
    if (bloodworkFiles.length > 0) {
      setUploadingFiles(true);
      try {
        if (Platform.OS !== 'web') {
          for (const file of bloodworkFiles) {
            const filename = file.uri.split('/').pop() || 'upload';
            const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

            const formData = new FormData();
            formData.append('file', {
              uri: file.uri,
              name: filename,
              type: mimeType,
            } as unknown as Blob);
            formData.append('lead_id', client?.id || 'unknown');
            formData.append('category', 'bloodwork');

            const res = await fetch(`${AI_API_BASE}/api/upload`, {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              if (data.url) fileUrls.push(data.url);
            }
          }
        } else {
          // Web preview: note files were selected but skip actual upload
          fileUrls = bloodworkFiles.map(f => `[file: ${f.name}]`);
        }
      } catch (err) {
        console.error('Upload error:', err);
        Alert.alert('Upload Error', 'Failed to upload files. You can still paste your results as text.');
        setUploadingFiles(false);
        // Don't return — let them proceed with text-based analysis
      }
      setUploadingFiles(false);
    }

    const fileNote = fileUrls.length > 0
      ? `\n\n[${fileUrls.length} bloodwork file(s) uploaded and saved to your records]`
      : '';

    let fullQuestion: string;
    if (activeTab === 'bloodwork') {
      const hasText = bloodwork.trim().length > 0;
      const hasFiles = fileUrls.length > 0;
      if (hasText) {
        fullQuestion = `Please analyze my bloodwork results. For each marker, tell me: the value, standard lab range, enhanced athlete acceptable range, and your assessment (normal/watch/intervene/red flag). Flag anything concerning, explain which compounds could cause abnormal values, and provide the intervention ladder (lifestyle > supplements with doses > pharmaceuticals with doses > discontinuation thresholds). Here are my results:\n\n${bloodwork.trim()}${fileNote}`;
      } else if (hasFiles) {
        fullQuestion = `I just uploaded ${fileUrls.length} bloodwork file(s) to my records. I don't have the values typed out yet. Based on my recent check-in data, please give me a general overview of what bloodwork markers I should be watching closely given my current protocol, and what optimal ranges look like for an enhanced athlete. Also remind me to paste my actual values next time for a full analysis.`;
      } else {
        fullQuestion = '';
      }
    } else {
      fullQuestion = q;
    }

    setLoading(true);
    setAnswer('');
    setAudioUri(null);
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
    setSpeakingState('idle');

    try {
      const result = await askCoach(fullQuestion, client?.id);
      setAnswer(result);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to get a response.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!answer) return;

    // If already have audio, toggle play/pause
    if (audioUri && playerRef.current) {
      if (speakingState === 'playing') {
        playerRef.current.pause();
        setSpeakingState('idle');
        return;
      }
      playerRef.current.play();
      setSpeakingState('playing');
      return;
    }

    setSpeakingState('generating');
    try {
      // Truncate to ~5000 chars for ElevenLabs free tier limits
      const textToSpeak = answer.length > 5000 ? answer.slice(0, 5000) + '...' : answer;
      const uri = await generateSpeech(textToSpeak, VOICE_IDS[voicePref]);
      setAudioUri(uri);
      const player = await playAudio(uri);
      playerRef.current = player;
      setSpeakingState('playing');
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing === false && status.currentTime >= status.duration && status.duration > 0) {
          setSpeakingState('idle');
        }
      });
    } catch (e: any) {
      setSpeakingState('idle');
      Alert.alert('Voice Error', e.message || 'Failed to generate speech.');
    }
  };

  const handleStop = () => {
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
    setAudioUri(null);
    setSpeakingState('idle');
  };

  const handlePickBloodwork = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });
      if (!result.canceled && result.assets?.length) {
        setBloodworkFiles(prev => [
          ...prev,
          ...result.assets.map(a => ({ name: a.name, uri: a.uri })),
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const removeBloodworkFile = (index: number) => {
    setBloodworkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSampleQuestion = (q: string) => {
    setQuestion(q);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <BrandHeader title="AI Coach" />
        <Text style={styles.subtitle}>
          127M+ words analyzed across 14K+ expert transcripts, 100+ sources — and growing
        </Text>

        <View style={{ backgroundColor: 'rgba(255,106,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,106,0,0.2)', borderRadius: 8, padding: 10, marginTop: -4 }}>
          <Text style={{ fontSize: 11, color: '#888', lineHeight: 16, textAlign: 'center' }}>
            Educational & research purposes only. Not medical advice. No recommendations for human consumption are made or implied. Consult a physician before making health changes.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ask' && styles.tabActive]}
            onPress={() => setActiveTab('ask')}
          >
            <Ionicons
              name="chatbubble-outline"
              size={15}
              color={activeTab === 'ask' ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'ask' && styles.tabTextActive]}>
              Ask Coach Bryan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bloodwork' && styles.tabActive]}
            onPress={() => setActiveTab('bloodwork')}
          >
            <Ionicons
              name="medkit-outline"
              size={15}
              color={activeTab === 'bloodwork' ? '#fff' : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'bloodwork' && styles.tabTextActive]}
            >
              Bloodwork
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ask Tab */}
        {activeTab === 'ask' && (
          <>
            {/* Sample Questions */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chips}
            >
              {SAMPLE_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.chip}
                  onPress={() => handleSampleQuestion(q)}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Ask about training, nutrition, PEDs, or protocols..."
              placeholderTextColor={colors.textTertiary}
              value={question}
              onChangeText={setQuestion}
              returnKeyType="send"
              onSubmitEditing={handleAsk}
            />
          </>
        )}

        {/* Bloodwork Tab */}
        {activeTab === 'bloodwork' && (
          <>
            {/* File Upload */}
            <TouchableOpacity style={styles.uploadZone} onPress={handlePickBloodwork}>
              <Ionicons
                name={bloodworkFiles.length > 0 ? 'document-attach' : 'cloud-upload-outline'}
                size={28}
                color={bloodworkFiles.length > 0 ? colors.green : colors.accent}
              />
              <Text style={styles.uploadZoneText}>
                {bloodworkFiles.length > 0
                  ? `${bloodworkFiles.length} file(s) attached`
                  : 'Tap to attach bloodwork PDF or photo'}
              </Text>
              <Text style={styles.uploadZoneHint}>PDF, JPG, PNG supported</Text>
            </TouchableOpacity>

            {bloodworkFiles.length > 0 && (
              <View style={styles.fileList}>
                {bloodworkFiles.map((file, i) => (
                  <View key={i} style={styles.fileItem}>
                    <Ionicons name="document" size={16} color={colors.accent} />
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <TouchableOpacity onPress={() => removeBloodworkFile(i)}>
                      <Ionicons name="close-circle" size={18} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.orText}>— or paste results below —</Text>

            <TextInput
              style={[styles.input, styles.inputLarge]}
              placeholder={`Paste your lab results here...\n\nExample:\nTestosterone Total: 856 ng/dL\nEstradiol (E2): 42 pg/mL\nHematocrit: 51.2%\nALT: 67 U/L\nAST: 54 U/L`}
              placeholderTextColor={colors.textTertiary}
              value={bloodwork}
              onChangeText={setBloodwork}
              multiline
              textAlignVertical="top"
            />
          </>
        )}

        {/* Submit */}
        <Button
          title={
            uploadingFiles
              ? 'Uploading files...'
              : loading
              ? 'Thinking...'
              : activeTab === 'ask'
              ? 'Ask Coach Bryan'
              : 'Analyze Bloodwork'
          }
          onPress={handleAsk}
          loading={loading || uploadingFiles}
          disabled={loading || uploadingFiles}
        />

        {/* Answer */}
        {(answer || loading) && (
          <Card style={styles.answerCard}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.loadingText}>Coach Bryan is thinking...</Text>
              </View>
            ) : (
              <>
                {/* Voice Controls */}
                <View style={styles.voiceRow}>
                  <TouchableOpacity
                    style={styles.voiceBtn}
                    onPress={handleSpeak}
                    disabled={speakingState === 'generating'}
                  >
                    {speakingState === 'generating' ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : (
                      <Ionicons
                        name={speakingState === 'playing' ? 'pause-circle' : 'volume-high'}
                        size={24}
                        color={colors.accent}
                      />
                    )}
                    <Text style={styles.voiceBtnText}>
                      {speakingState === 'generating'
                        ? 'Generating voice...'
                        : speakingState === 'playing'
                        ? 'Pause'
                        : 'Listen'}
                    </Text>
                  </TouchableOpacity>

                  {speakingState !== 'idle' && (
                    <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                      <Ionicons name="stop-circle" size={24} color={colors.red} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.divider} />

                {/* Text Answer */}
                <Text style={styles.answerText}>{answer}</Text>
              </>
            )}
          </Card>
        )}

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl * 3,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  chipsScroll: {
    marginHorizontal: -spacing.lg,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    flexDirection: 'row',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  inputLarge: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  uploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  uploadZoneText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  uploadZoneHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  fileList: {
    gap: spacing.xs,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fileName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  orText: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  answerCard: {
    gap: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentMuted,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    flex: 1,
  },
  voiceBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  stopBtn: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  answerText: {
    fontSize: fontSize.md,
    lineHeight: 26,
    color: colors.textPrimary,
  },
});
