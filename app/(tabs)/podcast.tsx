import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { generateSpeech, playAudio } from '../../lib/elevenlabs';

type Voice = { voice_id: string; name: string; category: string };

const PODCAST_TOPICS = [
  { id: 'motivation', label: 'Motivation', icon: 'flame-outline' as const, prompt: 'Give an energizing 60-second motivational speech for someone on their fitness journey. Be encouraging, direct, and reference the discipline of daily habits.' },
  { id: 'nutrition', label: 'Nutrition Tips', icon: 'nutrition-outline' as const, prompt: 'Share a concise, practical nutrition tip for someone focused on body recomposition. Include one actionable takeaway they can implement today.' },
  { id: 'recovery', label: 'Recovery', icon: 'bed-outline' as const, prompt: 'Explain one key recovery strategy for athletes in under 60 seconds. Cover why it matters and how to do it properly.' },
  { id: 'mindset', label: 'Mindset', icon: 'brain-outline' as const, prompt: 'Deliver a short podcast segment on mental toughness and consistency in fitness. Reference how small daily wins compound over time.' },
  { id: 'training', label: 'Training', icon: 'barbell-outline' as const, prompt: 'Share one training principle or technique tip in under 60 seconds. Be specific and practical.' },
  { id: 'custom', label: 'Custom Topic', icon: 'create-outline' as const, prompt: '' },
];

export default function PodcastScreen() {
  const insets = useSafeAreaInsets();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('21m00Tcm4TlvDq8ikWAM');
  const [showVoices, setShowVoices] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  const loadVoices = async () => {
    // Voice selection not available with proxy setup
    setShowVoices(true);
  };

  const handleGenerate = async () => {
    const topic = PODCAST_TOPICS.find((t) => t.id === selectedTopic);
    if (!topic) return;

    const text = topic.id === 'custom' ? customPrompt : topic.prompt;
    if (!text.trim()) {
      Alert.alert('Enter a topic', 'Please type what you want the podcast to cover.');
      return;
    }

    setGenerating(true);
    setAudioUri(null);
    setGeneratedText(text);

    try {
      // Stop any playing audio
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }

      const uri = await generateSpeech(text, selectedVoice);
      setAudioUri(uri);
    } catch (e: any) {
      Alert.alert('Generation Failed', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePlayPause = async () => {
    if (!audioUri) return;

    if (playing && playerRef.current) {
      playerRef.current.pause();
      setPlaying(false);
      return;
    }

    if (playerRef.current) {
      playerRef.current.play();
      setPlaying(true);
      return;
    }

    try {
      setPlaying(true);
      const player = await playAudio(audioUri);
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing === false && status.currentTime >= status.duration && status.duration > 0) {
          setPlaying(false);
          playerRef.current = null;
        }
      });
    } catch (e: any) {
      setPlaying(false);
      Alert.alert('Playback Error', e.message);
    }
  };

  const selectedVoiceName = voices.find((v) => v.voice_id === selectedVoice)?.name || 'Rachel';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <Text style={styles.title}>Podcast Studio</Text>
      <Text style={styles.subtitle}>Generate AI-powered fitness audio content</Text>

      {/* Voice Selector */}
      <TouchableOpacity style={styles.voiceSelector} onPress={loadVoices}>
        <Ionicons name="mic-outline" size={18} color={colors.accent} />
        <Text style={styles.voiceLabel}>Voice: {selectedVoiceName}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {showVoices && (
        <Card style={styles.voiceList}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {voices.map((v) => (
              <TouchableOpacity
                key={v.voice_id}
                style={[
                  styles.voiceOption,
                  v.voice_id === selectedVoice && styles.voiceOptionActive,
                ]}
                onPress={() => {
                  setSelectedVoice(v.voice_id);
                  setShowVoices(false);
                }}
              >
                <Text
                  style={[
                    styles.voiceOptionText,
                    v.voice_id === selectedVoice && styles.voiceOptionTextActive,
                  ]}
                >
                  {v.name}
                </Text>
                <Text style={styles.voiceCategory}>{v.category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Topic Selection */}
      <Text style={styles.sectionTitle}>Choose a Topic</Text>
      <View style={styles.topicGrid}>
        {PODCAST_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={[
              styles.topicCard,
              selectedTopic === topic.id && styles.topicCardActive,
            ]}
            onPress={() => setSelectedTopic(topic.id)}
          >
            <Ionicons
              name={topic.icon}
              size={24}
              color={selectedTopic === topic.id ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[
                styles.topicLabel,
                selectedTopic === topic.id && styles.topicLabelActive,
              ]}
            >
              {topic.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Prompt */}
      {selectedTopic === 'custom' && (
        <TextInput
          style={styles.input}
          placeholder="Describe what you want the podcast to cover..."
          placeholderTextColor={colors.textTertiary}
          value={customPrompt}
          onChangeText={setCustomPrompt}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      )}

      {/* Generate Button */}
      {selectedTopic && (
        <Button
          title={generating ? 'Generating...' : 'Generate Audio'}
          onPress={handleGenerate}
          loading={generating}
          disabled={generating || (selectedTopic === 'custom' && !customPrompt.trim())}
        />
      )}

      {/* Audio Player */}
      {audioUri && (
        <Card style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <Ionicons name="radio-outline" size={20} color={colors.accent} />
            <Text style={styles.playerTitle}>
              {PODCAST_TOPICS.find((t) => t.id === selectedTopic)?.label || 'Podcast'}
            </Text>
          </View>

          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <Ionicons
              name={playing ? 'pause-circle' : 'play-circle'}
              size={64}
              color={colors.accent}
            />
          </TouchableOpacity>

          <Text style={styles.playerHint}>
            {playing ? 'Playing...' : 'Tap to play'}
          </Text>
        </Card>
      )}

      {generating && (
        <Card style={styles.generatingCard}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.generatingText}>Generating your podcast audio...</Text>
        </Card>
      )}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
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
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  voiceList: {
    padding: spacing.xs,
  },
  voiceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  voiceOptionActive: {
    backgroundColor: colors.accentMuted,
  },
  voiceOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  voiceOptionTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  voiceCategory: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  topicCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  topicLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  topicLabelActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    minHeight: 100,
  },
  playerCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  playButton: {
    padding: spacing.sm,
  },
  playerHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  generatingCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  generatingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
