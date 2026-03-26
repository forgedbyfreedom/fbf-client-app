import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { Card } from '../../components/ui/Card';
import { SupplementCard } from '../../components/supplements/SupplementCard';
import {
  SupplementTimeline,
  buildTimelineItems,
} from '../../components/supplements/SupplementTimeline';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

type TabView = 'protocols' | 'timeline';

function getStorageKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `fbf_supplement_log_${y}-${m}-${d}`;
}

function getDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SupplementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client, refreshClientData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('protocols');
  const [complianceMap, setComplianceMap] = useState<Record<string, boolean>>({});
  const [weeklyData, setWeeklyData] = useState<Record<string, Record<string, boolean>>>({});

  const supplements = useMemo(() => client?.current_supplements || [], [client]);
  const peptides = useMemo(() => client?.current_peptides || [], [client]);
  const peds = useMemo(() => client?.current_peds || [], [client]);
  const medical = useMemo(() => client?.medical_protocol || [], [client]);

  const totalItems = supplements.length + peptides.length + peds.length + medical.length;

  // Build all item keys
  const allKeys = useMemo(() => {
    const keys: string[] = [];
    for (const s of supplements) keys.push(`supplement_${s.name}`);
    for (const p of peptides) keys.push(`peptide_${p.name}`);
    for (const c of peds) keys.push(`ped_${c.compound}`);
    for (const m of medical) keys.push(`medical_${m.name}`);
    return keys;
  }, [supplements, peptides, peds, medical]);

  // Load today's compliance from AsyncStorage
  useEffect(() => {
    const today = new Date();
    const key = getStorageKey(today);
    AsyncStorage.getItem(key).then((val) => {
      if (val) {
        try {
          setComplianceMap(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  // Load weekly data for compliance percentage
  useEffect(() => {
    const days = getLast7Days();
    const loadWeekly = async () => {
      const weekly: Record<string, Record<string, boolean>> = {};
      for (const day of days) {
        const key = getStorageKey(day);
        const dateStr = getDateStr(day);
        const val = await AsyncStorage.getItem(key);
        if (val) {
          try {
            weekly[dateStr] = JSON.parse(val);
          } catch {}
        } else {
          weekly[dateStr] = {};
        }
      }
      setWeeklyData(weekly);
    };
    loadWeekly();
  }, [complianceMap]);

  // Save compliance when it changes
  const saveCompliance = useCallback(
    async (map: Record<string, boolean>) => {
      const key = getStorageKey(new Date());
      await AsyncStorage.setItem(key, JSON.stringify(map));
    },
    []
  );

  const toggleItem = useCallback(
    (itemKey: string) => {
      setComplianceMap((prev) => {
        const next = { ...prev, [itemKey]: !prev[itemKey] };
        saveCompliance(next);
        return next;
      });
    },
    [saveCompliance]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshClientData();
    setRefreshing(false);
  }, [refreshClientData]);

  // Calculate today's compliance
  const takenToday = allKeys.filter((k) => complianceMap[k]).length;
  const compliancePct = totalItems > 0 ? Math.round((takenToday / totalItems) * 100) : 0;

  // Calculate weekly compliance
  const weeklyCompliancePct = useMemo(() => {
    if (totalItems === 0) return 0;
    const days = getLast7Days();
    let totalPossible = 0;
    let totalTaken = 0;
    for (const day of days) {
      const dateStr = getDateStr(day);
      const dayData = weeklyData[dateStr] || {};
      totalPossible += allKeys.length;
      totalTaken += allKeys.filter((k) => dayData[k]).length;
    }
    return totalPossible > 0 ? Math.round((totalTaken / totalPossible) * 100) : 0;
  }, [weeklyData, allKeys, totalItems]);

  // Timeline items
  const timelineItems = useMemo(
    () => buildTimelineItems(supplements, peptides, peds, medical, complianceMap),
    [supplements, peptides, peds, medical, complianceMap]
  );

  const hasNoProtocols = totalItems === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl * 2 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <BrandHeader title="Supplements & Protocols" compact />
      </View>

      {/* Compliance Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{compliancePct}%</Text>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryDetail}>{takenToday}/{totalItems}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{weeklyCompliancePct}%</Text>
            <Text style={styles.summaryLabel}>7-Day Avg</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalItems}</Text>
            <Text style={styles.summaryLabel}>Protocols</Text>
          </View>
        </View>

        {/* Weekly mini chart */}
        <View style={styles.weeklyChart}>
          {getLast7Days().map((day) => {
            const dateStr = getDateStr(day);
            const dayData = weeklyData[dateStr] || {};
            const dayTaken = allKeys.filter((k) => dayData[k]).length;
            const dayPct = totalItems > 0 ? dayTaken / totalItems : 0;
            const isToday = getDateStr(day) === getDateStr(new Date());

            return (
              <View key={dateStr} style={styles.weeklyDay}>
                <View style={styles.weeklyBarBg}>
                  <View
                    style={[
                      styles.weeklyBarFill,
                      { height: `${Math.max(dayPct * 100, 4)}%` },
                      dayPct >= 1 && styles.weeklyBarComplete,
                    ]}
                  />
                </View>
                <Text style={[styles.weeklyDayLabel, isToday && styles.weeklyDayLabelToday]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Tab Toggle */}
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'protocols' && styles.tabActive]}
          onPress={() => setActiveTab('protocols')}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeTab === 'protocols' ? colors.accent : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'protocols' && styles.tabTextActive]}>
            My Protocols
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'timeline' ? colors.accent : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            Daily Timeline
          </Text>
        </TouchableOpacity>
      </View>

      {hasNoProtocols ? (
        <Card>
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Protocols Assigned</Text>
            <Text style={styles.emptySubtitle}>
              Your coach hasn't assigned any supplements or protocols yet. Check back soon!
            </Text>
          </View>
        </Card>
      ) : activeTab === 'protocols' ? (
        <>
          {/* Supplements Section */}
          {supplements.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>
                <Ionicons name="nutrition-outline" size={14} color={colors.accent} />
                {'  '}My Supplements
              </Text>
              {supplements.map((item) => {
                const key = `supplement_${item.name}`;
                return (
                  <SupplementCard
                    key={key}
                    item={{
                      name: item.name,
                      dose: item.dose,
                      timing: item.frequency,
                      frequency: item.frequency,
                    }}
                    type="supplement"
                    taken={!!complianceMap[key]}
                    onToggle={() => toggleItem(key)}
                  />
                );
              })}
            </>
          )}

          {/* Peptides Section */}
          {peptides.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>
                <Ionicons name="flask-outline" size={14} color={colors.accent} />
                {'  '}My Peptides
              </Text>
              {peptides.map((item) => {
                const key = `peptide_${item.name}`;
                return (
                  <SupplementCard
                    key={key}
                    item={{
                      name: item.name,
                      dose: item.dose,
                      timing: item.timing,
                      frequency: item.frequency,
                    }}
                    type="peptide"
                    taken={!!complianceMap[key]}
                    onToggle={() => toggleItem(key)}
                  />
                );
              })}
            </>
          )}

          {/* PEDs/Compounds Section */}
          {peds.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>
                <Ionicons name="fitness-outline" size={14} color={colors.accent} />
                {'  '}My Compounds
              </Text>
              {peds.map((item) => {
                const key = `ped_${item.compound || (item as any).name}`;
                return (
                  <SupplementCard
                    key={key}
                    item={{
                      name: item.compound,
                      compound: item.compound,
                      dose: item.dose,
                      frequency: item.frequency,
                      route: item.route,
                    }}
                    type="ped"
                    taken={!!complianceMap[key]}
                    onToggle={() => toggleItem(key)}
                  />
                );
              })}
            </>
          )}

          {/* Medical Protocol Section */}
          {medical.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>
                <Ionicons name="medkit-outline" size={14} color={colors.accent} />
                {'  '}Medical Protocol
              </Text>
              {medical.map((item) => {
                const key = `medical_${item.name}`;
                return (
                  <SupplementCard
                    key={key}
                    item={{
                      name: item.name,
                      dose: item.dose,
                      timing: item.frequency,
                      frequency: item.frequency,
                      notes: item.notes,
                    }}
                    type="medical"
                    taken={!!complianceMap[key]}
                    onToggle={() => toggleItem(key)}
                  />
                );
              })}
            </>
          )}

          {/* Mark All Button */}
          {totalItems > 0 && (
            <TouchableOpacity
              style={[styles.markAllBtn, takenToday === totalItems && styles.markAllBtnDone]}
              onPress={() => {
                const allDone = takenToday === totalItems;
                const next: Record<string, boolean> = {};
                for (const k of allKeys) {
                  next[k] = !allDone;
                }
                setComplianceMap(next);
                saveCompliance(next);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={takenToday === totalItems ? 'close-circle-outline' : 'checkmark-circle-outline'}
                size={20}
                color={takenToday === totalItems ? colors.red : colors.green}
              />
              <Text
                style={[
                  styles.markAllText,
                  takenToday === totalItems && styles.markAllTextDone,
                ]}
              >
                {takenToday === totalItems ? 'Reset All' : 'Mark All Taken'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        /* Timeline View */
        <SupplementTimeline items={timelineItems} />
      )}
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDetail: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 80,
  },
  weeklyDay: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  weeklyBarBg: {
    width: 20,
    height: 48,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBarFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
  },
  weeklyBarComplete: {
    backgroundColor: colors.green,
  },
  weeklyDayLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  weeklyDayLabelToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.accentMuted,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markAllBtnDone: {
    borderColor: colors.red,
  },
  markAllText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.green,
  },
  markAllTextDone: {
    color: colors.red,
  },
});
