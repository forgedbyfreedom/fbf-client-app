import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { markAllRead, refreshInbox, useCoachInbox } from '../lib/coach-inbox';
import { colors, borderRadius, fontSize, spacing } from '../lib/theme';

function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Program changes and notes from your coach, newest first. */
export default function CoachUpdatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, loaded } = useCoachInbox();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Entries that were unread when the screen opened keep their highlight.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const s = await refreshInbox();
      setFresh((prev) => {
        const next = new Set(prev);
        s.items.forEach((i) => !i.read && next.add(i.id));
        return next;
      });
      setError(null);
      await markAllRead();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load coach updates');
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Coach updates</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {!loaded && !error && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxxl }} />}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {loaded && items.length === 0 && (
          <Text style={styles.empty}>Nothing yet. When your coach changes your plan or sends you a note, it shows up here.</Text>
        )}
        {items.map((i) => (
          <View key={i.id} style={[styles.card, fresh.has(i.id) && styles.cardNew]}>
            <View style={styles.row}>
              <Ionicons
                name={i.kind === 'note' ? 'chatbubble-ellipses' : 'create'}
                size={16}
                color={colors.accent}
              />
              <Text style={styles.kind}>{i.kind === 'note' ? 'Note' : 'Program change'}</Text>
              <Text style={styles.when}>{when(i.at)}</Text>
            </View>
            <Text style={styles.from}>{i.from}</Text>
            <Text style={styles.body}>{i.body}</Text>
            {!!i.lines?.length && (
              <View style={styles.lines}>
                <Text style={styles.linesLabel}>What changed</Text>
                {i.lines.map((l, k) => (
                  <Text key={k} style={styles.line}>
                    • {l}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 6 },
  cardNew: { borderColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kind: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  when: { color: colors.textSecondary, fontSize: fontSize.xs },
  from: { color: colors.textSecondary, fontSize: fontSize.sm },
  body: { color: colors.textPrimary, fontSize: fontSize.md, lineHeight: 22 },
  lines: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, gap: 4, marginTop: 4 },
  linesLabel: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  line: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 19 },
  empty: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xxxl, lineHeight: 20 },
  error: { color: colors.red, fontSize: fontSize.sm, textAlign: 'center' },
});
