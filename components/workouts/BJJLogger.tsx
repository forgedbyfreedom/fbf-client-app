import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BJJSession } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { useAuth } from '../../hooks/useAuth';

const BJJ_LOGS_KEY_PREFIX = 'fbf-bjj-logs';

interface BJJLogEntry {
  id: string;
  date: string;
  session: BJJSession;
  duration_min: number;
}

interface BJJLoggerProps {
  onSessionLogged?: () => void;
}

export function BJJLogger({ onSessionLogged }: BJJLoggerProps) {
  const { client } = useAuth();
  const clientId = client?.id;
  const logsKey = clientId ? `${BJJ_LOGS_KEY_PREFIX}-${clientId}` : null;

  const [isLogging, setIsLogging] = useState(false);
  const [logs, setLogs] = useState<BJJLogEntry[]>([]);
  const [showTotals, setShowTotals] = useState<'month' | 'year' | null>('month');

  // Form state
  const [bjjType, setBjjType] = useState<'gi' | 'no-gi' | 'both'>('no-gi');
  const [rounds, setRounds] = useState('5');
  const [roundLength, setRoundLength] = useState('5');
  const [restBetween, setRestBetween] = useState('1');
  const [drillTime, setDrillTime] = useState('30');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'hard'>('moderate');
  const [notes, setNotes] = useState('');

  // Load logs
  useEffect(() => {
    if (!logsKey) return;
    AsyncStorage.getItem(logsKey).then((saved) => {
      if (saved) {
        try { setLogs(JSON.parse(saved)); } catch {}
      }
    });
  }, [logsKey]);

  const saveLog = useCallback(async (entry: BJJLogEntry) => {
    if (!logsKey) return;
    const updated = [entry, ...logs];
    setLogs(updated);
    await AsyncStorage.setItem(logsKey, JSON.stringify(updated));
  }, [logs, logsKey]);

  const handleFinish = useCallback(async () => {
    const r = parseInt(rounds, 10) || 0;
    const rl = parseInt(roundLength, 10) || 0;
    const rb = parseInt(restBetween, 10) || 0;
    const dt = parseInt(drillTime, 10) || 0;

    if (r === 0) {
      Alert.alert('Missing Info', 'Enter the number of rounds.');
      return;
    }

    const totalMin = (r * rl) + ((r - 1) * rb) + dt;

    const session: BJJSession = {
      type: bjjType,
      rounds: r,
      round_length_min: rl,
      rest_between_min: rb,
      drill_time_min: dt,
      intensity,
      notes: notes || undefined,
    };

    const entry: BJJLogEntry = {
      id: `bjj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      session,
      duration_min: totalMin,
    };

    await saveLog(entry);
    setIsLogging(false);
    resetForm();
    onSessionLogged?.();
  }, [bjjType, rounds, roundLength, restBetween, drillTime, intensity, notes, saveLog, onSessionLogged]);

  const resetForm = () => {
    setBjjType('no-gi');
    setRounds('5');
    setRoundLength('5');
    setRestBetween('1');
    setDrillTime('30');
    setIntensity('moderate');
    setNotes('');
  };

  // Calculate totals
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear = String(now.getFullYear());

  const monthLogs = logs.filter((l) => l.date.startsWith(thisMonth));
  const yearLogs = logs.filter((l) => l.date.startsWith(thisYear));

  const calcTotals = (entries: BJJLogEntry[]) => ({
    sessions: entries.length,
    totalRounds: entries.reduce((a, e) => a + e.session.rounds, 0),
    totalMinutes: entries.reduce((a, e) => a + e.duration_min, 0),
    avgIntensity: entries.length > 0
      ? entries.reduce((a, e) => a + (e.session.intensity === 'hard' ? 3 : e.session.intensity === 'moderate' ? 2 : 1), 0) / entries.length
      : 0,
  });

  const monthTotals = calcTotals(monthLogs);
  const yearTotals = calcTotals(yearLogs);

  // Active logging form
  if (isLogging) {
    return (
      <Card style={styles.logCard}>
        <View style={styles.logHeader}>
          <Ionicons name="body-outline" size={20} color={colors.accent} />
          <Text style={styles.logTitle}>Log BJJ Session</Text>
        </View>

        {/* Type */}
        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.chipRow}>
          {(['gi', 'no-gi', 'both'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, bjjType === t && styles.chipActive]}
              onPress={() => setBjjType(t)}
            >
              <Text style={[styles.chipText, bjjType === t && styles.chipTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rounds & Length */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Rounds</Text>
            <TextInput
              style={styles.input}
              value={rounds}
              onChangeText={setRounds}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Round Length (min)</Text>
            <TextInput
              style={styles.input}
              value={roundLength}
              onChangeText={setRoundLength}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Rest & Drill */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Rest Between (min)</Text>
            <TextInput
              style={styles.input}
              value={restBetween}
              onChangeText={setRestBetween}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Drill Time (min)</Text>
            <TextInput
              style={styles.input}
              value={drillTime}
              onChangeText={setDrillTime}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Intensity */}
        <Text style={styles.fieldLabel}>Intensity</Text>
        <View style={styles.chipRow}>
          {(['light', 'moderate', 'hard'] as const).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[styles.chip, intensity === lvl && styles.chipActive]}
              onPress={() => setIntensity(lvl)}
            >
              <Text style={[styles.chipText, intensity === lvl && styles.chipTextActive]}>
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Session notes (optional)"
          placeholderTextColor={colors.textTertiary}
          multiline
        />

        {/* Estimated duration preview */}
        {(() => {
          const r = parseInt(rounds, 10) || 0;
          const rl = parseInt(roundLength, 10) || 0;
          const rb = parseInt(restBetween, 10) || 0;
          const dt = parseInt(drillTime, 10) || 0;
          const total = (r * rl) + ((r > 1 ? r - 1 : 0) * rb) + dt;
          return total > 0 ? (
            <Text style={styles.durationPreview}>
              Estimated total: {total} min ({r} × {rl}min + {dt}min drills)
            </Text>
          ) : null;
        })()}

        <View style={styles.actionRow}>
          <Button title="Log Session" onPress={handleFinish} style={{ flex: 1 }} />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => { setIsLogging(false); resetForm(); }}
            style={{ flex: 0.4 }}
          />
        </View>
      </Card>
    );
  }

  // Default view — start button + totals
  return (
    <View style={styles.container}>
      <Card style={styles.bjjCard}>
        <View style={styles.bjjHeader}>
          <View style={styles.bjjTitleRow}>
            <Ionicons name="body-outline" size={22} color={colors.accent} />
            <Text style={styles.bjjTitle}>BJJ Training</Text>
          </View>
          <Button
            title="Log Session"
            onPress={() => setIsLogging(true)}
            style={styles.logBtn}
          />
        </View>

        {/* Recent session */}
        {logs.length > 0 && (
          <View style={styles.recentSession}>
            <Text style={styles.recentLabel}>Last Session</Text>
            <Text style={styles.recentDetail}>
              {logs[0].session.type.toUpperCase()} — {logs[0].session.rounds} rounds × {logs[0].session.round_length_min}min | {logs[0].session.intensity} intensity | {logs[0].duration_min}min total
            </Text>
            <Text style={styles.recentDate}>{formatBJJDate(logs[0].date)}</Text>
          </View>
        )}

        {/* Totals toggles */}
        <View style={styles.totalsToggle}>
          <TouchableOpacity
            style={[styles.totalsTab, showTotals === 'month' && styles.totalsTabActive]}
            onPress={() => setShowTotals(showTotals === 'month' ? null : 'month')}
          >
            <Text style={[styles.totalsTabText, showTotals === 'month' && styles.totalsTabTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.totalsTab, showTotals === 'year' && styles.totalsTabActive]}
            onPress={() => setShowTotals(showTotals === 'year' ? null : 'year')}
          >
            <Text style={[styles.totalsTabText, showTotals === 'year' && styles.totalsTabTextActive]}>
              This Year
            </Text>
          </TouchableOpacity>
        </View>

        {showTotals && (
          <View style={styles.totalsGrid}>
            {(() => {
              const t = showTotals === 'month' ? monthTotals : yearTotals;
              const avgLabel = t.avgIntensity >= 2.5 ? 'Hard' : t.avgIntensity >= 1.5 ? 'Moderate' : 'Light';
              return (
                <>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalValue}>{t.sessions}</Text>
                    <Text style={styles.totalLabel}>Sessions</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalValue}>{t.totalRounds}</Text>
                    <Text style={styles.totalLabel}>Rounds</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalValue}>{t.totalMinutes >= 60 ? `${(t.totalMinutes / 60).toFixed(1)}h` : `${t.totalMinutes}m`}</Text>
                    <Text style={styles.totalLabel}>Mat Time</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalValue}>{avgLabel}</Text>
                    <Text style={styles.totalLabel}>Avg Intensity</Text>
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </Card>
    </View>
  );
}

function formatBJJDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  bjjCard: { borderColor: colors.accent, borderWidth: 1 },
  bjjHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bjjTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bjjTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logBtn: {
    paddingHorizontal: spacing.lg,
    minHeight: 36,
    paddingVertical: spacing.sm,
  },
  recentSession: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  recentDetail: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  recentDate: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  totalsToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 3,
    gap: 3,
  },
  totalsTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  totalsTabActive: {
    backgroundColor: colors.accentMuted,
  },
  totalsTabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  totalsTabTextActive: {
    color: colors.accent,
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalItem: {
    alignItems: 'center',
    gap: 2,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.accent,
  },
  totalLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  // Logging form styles
  logCard: { borderColor: colors.accent, borderWidth: 1 },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  logTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  chipTextActive: {
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  durationPreview: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
