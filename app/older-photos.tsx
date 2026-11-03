import React, { useState } from 'react';
import { View, ScrollView, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard, Eyebrow, DisplayText } from '../components/ui/SectionCard';
import { submitOlderPhotos, PhotoSlot, PickedPhoto } from '../lib/hub';
import { colors, fontSize, fonts, spacing } from '../lib/theme';

/**
 * Add progress photos taken before the app (or from another app) to the
 * photo timeline, with the date they were taken. They're compared and
 * auto-aligned like any check-in; no coach alert is sent.
 */
const POSES: PhotoSlot[] = ['front', 'side', 'back'];
const pad = (n: number) => String(n).padStart(2, '0');

function parseDate(m: string, d: string, y: string): string | null {
  const mm = parseInt(m, 10);
  const dd = parseInt(d, 10);
  let yy = parseInt(y, 10);
  if (yy > 0 && yy < 100) yy += 2000;
  if (!mm || !dd || !yy || mm > 12 || dd > 31 || yy < 2000) return null;
  const dt = new Date(yy, mm - 1, dd);
  if (dt.getMonth() !== mm - 1) return null; // e.g. Feb 30
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt >= today) return null;
  return `${yy}-${pad(mm)}-${pad(dd)}`;
}

export default function OlderPhotosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [m, setM] = useState('');
  const [d, setD] = useState('');
  const [y, setY] = useState('');
  const [weight, setWeight] = useState('');
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, PickedPhoto>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);

  const date = parseDate(m, d, y);
  const count = POSES.filter((p) => photos[p]).length;
  const canSave = !!date && count > 0 && !busy;

  const pick = async (slot: PhotoSlot) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setPhotos((p) => ({ ...p, [slot]: { uri: a.uri, file: (a as any).file } }));
    }
  };

  const save = async () => {
    if (!canSave || !date) return;
    setBusy(true);
    setError(null);
    try {
      const w = parseFloat(weight);
      await submitOlderPhotos(date, photos, Number.isFinite(w) && w > 50 ? w : undefined);
      setSaved((n) => n + 1);
      setPhotos({});
      setWeight('');
      setM('');
      setD('');
      setY('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ gap: 6 }}>
          <Eyebrow>Photo timeline</Eyebrow>
          <DisplayText size={32}>Add older photos.</DisplayText>
          <Text style={styles.sub}>Photos from before you joined, or from another app. They line up and compare like any check-in.</Text>
        </View>

        {saved > 0 ? (
          <SectionCard eyebrow="Saved" title={`${saved} set${saved === 1 ? '' : 's'} added`} subtitle="Add another date below, or go back to compare." highlight />
        ) : null}

        <SectionCard eyebrow="01 · Date taken" subtitle="Month / day / year">
          <View style={styles.row}>
            <Field label="Month" value={m} onChange={setM} max={2} />
            <Field label="Day" value={d} onChange={setD} max={2} />
            <Field label="Year" value={y} onChange={setY} max={4} flex={1.6} />
          </View>
          {m && d && y && !date ? <Text style={styles.warn}>Enter a real date before today.</Text> : null}
        </SectionCard>

        <SectionCard eyebrow="02 · Photos" title="Front, side, back" subtitle="Add any you have. Full body, head to feet, aligns best.">
          <View style={styles.photoRow}>
            {POSES.map((p) => (
              <View key={p} style={{ flex: 1, gap: 6 }}>
                <TouchableOpacity onPress={() => pick(p)} accessibilityRole="button" accessibilityLabel={`Choose ${p} photo`}>
                  {photos[p] ? (
                    <Image source={{ uri: photos[p]!.uri }} style={styles.photo} />
                  ) : (
                    <View style={[styles.photo, styles.photoEmpty]}>
                      <Ionicons name="image-outline" size={22} color={colors.accentText} />
                      <Text style={styles.photoLabel}>{p[0].toUpperCase() + p.slice(1)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard eyebrow="03 · Weight · optional" subtitle="Your weight around that date, if you know it.">
          <Field label="Weight (lb)" value={weight} onChange={setWeight} max={5} />
        </SectionCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={[styles.submit, !canSave && { opacity: 0.45 }]} onPress={save} disabled={!canSave} accessibilityRole="button">
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.submitText}>Add to my timeline</Text>}
        </TouchableOpacity>
        {!canSave && !busy ? <Text style={styles.need}>Needs the date and at least one photo.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, max, flex = 1 }: { label: string; value: string; onChange: (v: string) => void; max: number; flex?: number }) {
  return (
    <View style={{ flex, gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, '').slice(0, max))}
        keyboardType="number-pad"
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
  row: { flexDirection: 'row', gap: spacing.sm },
  fieldLabel: { color: colors.textSecondary, fontSize: 12 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, color: colors.textPrimary, paddingHorizontal: spacing.md, fontSize: fontSize.lg, fontFamily: fonts.display },
  warn: { color: colors.yellow, fontSize: 12, marginTop: 6 },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photo: { width: '100%', aspectRatio: 0.66, borderRadius: 14, backgroundColor: colors.surfaceSunken },
  photoEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoLabel: { color: colors.accentText, fontSize: 12, fontWeight: '600' },
  error: { color: colors.red, textAlign: 'center' },
  submit: { height: 56, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md + 1 },
  need: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
});
