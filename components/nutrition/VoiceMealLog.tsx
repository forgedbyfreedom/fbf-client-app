import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

const MEALS = ['Auto', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'];

interface Props {
  onSubmit: (text: string, mealLabel?: string) => Promise<{ summary: string }>;
}

/**
 * "Say what you ate" — the user taps the box and dictates with the keyboard's
 * microphone (or types). The site's AI turns it into itemized foods with macros.
 */
export function VoiceMealLog({ onSubmit }: Props) {
  const [text, setText] = useState('');
  const [meal, setMeal] = useState('Auto');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

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

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="mic" size={18} color={colors.accent} />
        <Text style={styles.title}>Say what you ate</Text>
      </View>
      <Text style={styles.hint}>
        Tap the box, then the microphone on your keyboard. Amounts help: "8 oz chicken, 1 cup jasmine rice,
        tablespoon of olive oil."
      </Text>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="What did you eat?"
        placeholderTextColor={colors.textTertiary}
        multiline
        editable={!busy}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={submit}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {MEALS.map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMeal(m)}
            style={[styles.chip, meal === m && styles.chipOn]}
            disabled={busy}
          >
            <Text style={[styles.chipText, meal === m && styles.chipTextOn]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, (!text.trim() || busy) && styles.buttonOff]}
        onPress={submit}
        disabled={!text.trim() || busy}
        activeOpacity={0.8}
      >
        {busy ? (
          <>
            <ActivityIndicator color="#fff" />
            <Text style={styles.buttonText}>Working out the macros…</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Log it</Text>
        )}
      </TouchableOpacity>

      {result && (
        <Text style={[styles.result, { color: result.ok ? colors.green : colors.red }]}>{result.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16 },
  input: {
    minHeight: 72,
    maxHeight: 160,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  chips: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: colors.accent },
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  buttonOff: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  result: { fontSize: fontSize.sm, lineHeight: 19 },
});
