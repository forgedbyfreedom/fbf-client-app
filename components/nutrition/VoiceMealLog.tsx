import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDictation } from '../../hooks/useDictation';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

const MEALS = ['Auto', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

interface Props {
  onSubmit: (text: string, mealLabel?: string) => Promise<{ summary: string }>;
  /** Shorter heading for places where it sits under other content. */
  compact?: boolean;
}

/**
 * Off plan? Tap the mic and say what you ate (or type it). The words land in the
 * box so they can be fixed, then the site's AI turns them into foods with macros.
 * Logged foods that aren't from the meal plan count as off-plan for the coach.
 */
export function VoiceMealLog({ onSubmit, compact }: Props) {
  const [text, setText] = useState('');
  const [meal, setMeal] = useState('Auto');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const dictation = useDictation((t) => {
    setText((prev) => (prev.trim() ? prev.trim() + ', ' + t : t));
    Haptics.selectionAsync().catch(() => undefined);
  });
  const listening = dictation.state === 'listening';
  const transcribing = dictation.state === 'transcribing';

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    Keyboard.dismiss();
    setBusy(true);
    setResult(null);
    try {
      const r = await onSubmit(t, meal === 'Auto' ? undefined : meal);
      setText('');
      setResult({ ok: true, message: r.summary });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setResult({
        ok: false,
        message: /network|abort|fetch/i.test(msg)
          ? "Couldn't reach Forged by Freedom. Check your connection and tap Log again — your words are still in the box."
          : msg,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const mmss = `0:${String(dictation.seconds).padStart(2, '0')}`;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{compact ? 'LOG A MEAL' : 'OFF PLAN? NO PROBLEM'}</Text>
      <Text style={styles.title}>Say what you ate.</Text>

      <View style={styles.micRow}>
        <TouchableOpacity
          onPress={dictation.toggle}
          disabled={transcribing || busy}
          style={[styles.mic, listening && styles.micLive, (transcribing || busy) && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Stop recording' : 'Start recording what you ate'}
          activeOpacity={0.85}
        >
          {transcribing ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Ionicons name={listening ? 'stop' : 'mic'} size={30} color={listening ? colors.textPrimary : colors.onAccent} />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.micLabel}>
            {listening ? `Listening… ${mmss}` : transcribing ? 'Writing it down…' : 'Tap the mic and talk'}
          </Text>
          <Text style={styles.micHint}>
            {listening
              ? 'Tap again when you\'re done.'
              : 'Amounts help: "8 oz chicken, a cup of rice, two slices of pizza".'}
          </Text>
        </View>
      </View>

      {listening && dictation.interim ? <Text style={styles.interim}>{dictation.interim}</Text> : null}
      {dictation.error ? <Text style={styles.error}>{dictation.error}</Text> : null}

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="…or type it here"
        placeholderTextColor={colors.textTertiary}
        multiline
        editable={!busy}
        accessibilityLabel="What you ate"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {MEALS.map((m) => (
          <TouchableOpacity key={m} onPress={() => setMeal(m)} style={[styles.chip, meal === m && styles.chipOn]} disabled={busy} accessibilityRole="button">
            <Text style={[styles.chipText, meal === m && styles.chipTextOn]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, (!text.trim() || busy || listening) && styles.buttonOff]}
        onPress={submit}
        disabled={!text.trim() || busy || listening}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        {busy ? (
          <>
            <ActivityIndicator color={colors.onAccent} />
            <Text style={styles.buttonText}>Working out the macros…</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Log it</Text>
        )}
      </TouchableOpacity>

      {result ? <Text style={[styles.result, { color: result.ok ? colors.green : colors.red }]}>{result.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.borderAccent, padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.accentText, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 24, marginTop: -6 },
  micRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mic: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  micLive: { backgroundColor: colors.red, transform: [{ scale: 1.05 }] },
  micLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSize.md },
  micHint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  interim: { color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  error: { color: colors.yellow, fontSize: 13, lineHeight: 18 },
  input: {
    minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary, padding: spacing.md, fontSize: fontSize.md, textAlignVertical: 'top',
  },
  chips: { gap: 6 },
  chip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.borderLight, justifyContent: 'center' },
  chipOn: { backgroundColor: '#2A2414', borderColor: colors.borderAccent },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextOn: { color: colors.accentText, fontWeight: '600' },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  buttonOff: { opacity: 0.45 },
  buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  result: { fontSize: fontSize.sm, lineHeight: 19 },
});
