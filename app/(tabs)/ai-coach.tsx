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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { generateSpeech, playAudio } from '../../lib/elevenlabs';
import { useAuth } from '../../hooks/useAuth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://forged-by-freedom-api-nm4f.onrender.com';

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
    const res = await fetch(`${API_BASE}/api/coach-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, client_id: clientId }),
    });
    const data = await res.json();
    if (data.reply) return data.reply;
  } catch {}

  // Fallback to generic /ask
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
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

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  const handleAsk = async () => {
    const q = activeTab === 'ask' ? question.trim() : '';
    if (activeTab === 'ask' && !q) return;

    if (activeTab === 'bloodwork' && !bloodwork.trim()) {
      Alert.alert('Missing Data', 'Please paste your bloodwork results.');
      return;
    }

    const fullQuestion =
      activeTab === 'bloodwork'
        ? `Please analyze my bloodwork results. For each marker, tell me: the value, standard lab range, enhanced athlete acceptable range, and your assessment (normal/watch/intervene/red flag). Flag anything concerning, explain which compounds could cause abnormal values, and provide the intervention ladder (lifestyle > supplements with doses > pharmaceuticals with doses > discontinuation thresholds). Here are my results:\n\n${bloodwork.trim()}`
        : q;

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
      const uri = await generateSpeech(textToSpeak);
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
        <Text style={styles.title}>AI Coach</Text>
        <Text style={styles.subtitle}>
          127M+ word knowledge base — training, nutrition, PEDs, protocols
        </Text>

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
          <TextInput
            style={[styles.input, styles.inputLarge]}
            placeholder={`Paste your lab results here...\n\nExample:\nTestosterone Total: 856 ng/dL\nEstradiol (E2): 42 pg/mL\nHematocrit: 51.2%\nALT: 67 U/L\nAST: 54 U/L`}
            placeholderTextColor={colors.textTertiary}
            value={bloodwork}
            onChangeText={setBloodwork}
            multiline
            textAlignVertical="top"
          />
        )}

        {/* Submit */}
        <Button
          title={
            loading
              ? 'Thinking...'
              : activeTab === 'ask'
              ? 'Ask Coach Bryan'
              : 'Analyze Bloodwork'
          }
          onPress={handleAsk}
          loading={loading}
          disabled={loading}
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
