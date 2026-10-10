import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { coachApi, AskResult, CoachMe } from '../../lib/coach';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

/**
 * Coach console. Coaches change their assigned clients' programs by asking;
 * Bryan (head coach) can also add/remove coaches and assign clients.
 * Every request shows exactly what will change and waits for Confirm.
 */
export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<CoachMe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'ask' | 'confirm' | null>(null);
  const [preview, setPreview] = useState<AskResult | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setMe(await coachApi.me());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not reach Forged by Freedom');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : 'Something went wrong';
    setMessage({
      ok: false,
      text: /network|abort|fetch/i.test(msg) ? "Couldn't reach Forged by Freedom. Check your connection and try again." : msg,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  };

  const ask = async () => {
    const t = text.trim();
    if (!t || busy) return;
    Keyboard.dismiss();
    setBusy('ask');
    setMessage(null);
    setPreview(null);
    try {
      const r = await coachApi.ask(t);
      if (r.clarify || !r.id) {
        setMessage({ ok: false, text: r.clarify || r.summary });
      } else {
        setPreview(r);
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!preview?.id || busy) return;
    setBusy('confirm');
    try {
      const r = await coachApi.confirm(preview.id);
      setPreview(null);
      setText('');
      setMessage({ ok: true, text: r.summary });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      load();
    } catch (e) {
      setPreview(null);
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => {
    if (preview?.id) coachApi.cancel(preview.id).catch(() => undefined);
    setPreview(null);
    setMessage({ ok: true, text: 'Cancelled. Nothing was changed.' });
  };

  const undo = (id: number, name: string) => {
    Alert.alert('Undo last change', `Restore ${name}'s program to before the most recent coach change?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await coachApi.undo(id);
            setMessage({ ok: true, text: r.summary });
            load();
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);
  };

  if (!me && !loadError) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (me && !me.is_coach) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>The coach console is for Forged by Freedom coaches.</Text>
      </View>
    );
  }

  const examples = me?.is_head
    ? ['Set Jim Weldon\'s protein to 220 g and calories to 2,600', 'Make jane@example.com a coach', 'Assign Jim and Terri Weldon to Jane']
    : ['Set Jim\'s protein to 220 g', 'Swap leg press for hack squat on Jim\'s leg day', 'Add 10 minutes of incline walking after every lift for Jim'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BrandHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.h1}>{me?.is_head ? 'Head Coach' : 'Coach'}</Text>
        {loadError && <Text style={styles.error}>{loadError}</Text>}

        {/* Ask */}
        <View style={styles.card}>
          <Text style={styles.label}>What do you want to change?</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Tap here, then the mic on your keyboard"
            placeholderTextColor={colors.textTertiary}
            multiline
            editable={!busy}
          />
          {!preview && (
            <TouchableOpacity
              style={[styles.primary, (!text.trim() || !!busy) && styles.off]}
              disabled={!text.trim() || !!busy}
              onPress={ask}
            >
              {busy === 'ask' ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryText}>Working it out…</Text>
                </>
              ) : (
                <Text style={styles.primaryText}>Preview change</Text>
              )}
            </TouchableOpacity>
          )}
          {!text && !preview && (
            <View style={styles.examples}>
              {examples.map((e) => (
                <TouchableOpacity key={e} onPress={() => setText(e)}>
                  <Text style={styles.example}>“{e}”</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {message && <Text style={[styles.message, { color: message.ok ? colors.green : colors.yellow }]}>{message.text}</Text>}

        {/* Preview */}
        {preview && (
          <View style={[styles.card, styles.previewCard]}>
            <Text style={styles.label}>Review before saving</Text>
            {(preview.changes || []).map((c, i) => (
              <View key={i} style={styles.change}>
                <Text style={styles.changeTitle}>{c.title}</Text>
                {(c.edits || []).map((e, j) => (
                  <View key={j} style={styles.edit}>
                    <Text style={styles.before}>− {e.before}</Text>
                    <Text style={styles.after}>+ {e.after}</Text>
                  </View>
                ))}
                {!!c.totals && <Text style={styles.totals}>New daily totals: {c.totals}</Text>}
                {!!c.note && <Text style={styles.note}>{c.note}</Text>}
              </View>
            ))}
            {(preview.warnings || []).map((w, i) => (
              <Text key={i} style={styles.note}>
                Not included: {w}
              </Text>
            ))}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.secondary, !!busy && styles.off]} disabled={!!busy} onPress={cancel}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primary, styles.flex, !!busy && styles.off]} disabled={!!busy} onPress={confirm}>
                {busy === 'confirm' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Clients */}
        <Text style={styles.h2}>{me?.is_head ? 'All clients' : 'Your clients'}</Text>
        {me?.clients.length === 0 && (
          <Text style={styles.muted}>{me.is_head ? 'No clients yet.' : 'No clients assigned to you yet. Ask Bryan to assign some.'}</Text>
        )}
        {me?.clients.map((c) => (
          <View key={c.id} style={styles.client}>
            <View style={styles.flex}>
              <Text style={styles.clientName}>{c.name}</Text>
              <Text style={styles.clientMeta}>
                {!c.has_program ? 'No program yet' : c.approved ? 'Program approved' : 'Draft — not released'}
                {me.is_head && c.coach ? ` · Coach: ${c.coach}` : ''}
              </Text>
            </View>
            {c.can_undo && (
              <TouchableOpacity onPress={() => undo(c.id, c.name)} style={styles.undo}>
                <Ionicons name="arrow-undo-outline" size={16} color={colors.accent} />
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {me?.is_head && (
          <>
            <Text style={styles.h2}>Coaches</Text>
            {(me.coaches || []).length === 0 && <Text style={styles.muted}>No coaches yet. Ask: “Make jane@example.com a coach.”</Text>}
            {(me.coaches || []).map((c) => (
              <View key={c.id} style={styles.client}>
                <View style={styles.flex}>
                  <Text style={styles.clientName}>{c.name}</Text>
                  <Text style={styles.clientMeta}>
                    {c.email} · {c.clients} client{c.clients === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg },
  h1: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },
  h2: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  previewCard: { borderColor: colors.accent, marginTop: spacing.md },
  label: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  input: {
    minHeight: 80,
    maxHeight: 180,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  primary: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  secondary: { alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  secondaryText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.md },
  off: { opacity: 0.5 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  examples: { gap: 6, marginTop: spacing.xs },
  example: { color: colors.textSecondary, fontSize: fontSize.sm },
  message: { marginTop: spacing.md, fontSize: fontSize.sm, lineHeight: 19 },
  error: { color: colors.red, fontSize: fontSize.sm, marginBottom: spacing.sm },
  change: { gap: 4, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  changeTitle: { color: colors.textPrimary, fontWeight: '600', fontSize: fontSize.sm },
  edit: { backgroundColor: colors.background, borderRadius: borderRadius.sm, padding: spacing.sm, gap: 2 },
  before: { color: colors.red, fontSize: fontSize.xs, fontFamily: 'Menlo', textDecorationLine: 'line-through' },
  after: { color: colors.green, fontSize: fontSize.xs, fontFamily: 'Menlo' },
  note: { color: colors.yellow, fontSize: fontSize.xs, lineHeight: 16 },
  totals: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '600' },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
  client: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  clientName: { color: colors.textPrimary, fontWeight: '600', fontSize: fontSize.md },
  clientMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.sm },
  undoText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
});
