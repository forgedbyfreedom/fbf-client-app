import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface MetabolicSystem {
  label: string;
  status: 'active' | 'inactive';
  signal: 'strong' | 'moderate' | 'weak' | 'neutral';
  metrics: Record<string, unknown>;
}

interface MetabolicMapData {
  map: Record<string, MetabolicSystem>;
  client_name: string;
}

const SYSTEM_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  training: { icon: 'barbell', color: '#ff6a00' },
  nutrition: { icon: 'nutrition', color: '#22c55e' },
  recovery: { icon: 'moon', color: '#8b5cf6' },
  body_comp: { icon: 'body', color: '#3b82f6' },
  hormones: { icon: 'flask', color: '#eab308' },
  adherence: { icon: 'checkmark-done', color: '#06b6d4' },
};

const SIGNAL_COLORS = {
  strong: '#22c55e',
  moderate: '#eab308',
  weak: '#ef4444',
  neutral: colors.textTertiary,
};

const SIGNAL_LABELS = {
  strong: 'Optimal',
  moderate: 'Needs Attention',
  weak: 'Critical',
  neutral: 'No Data',
};

interface MetabolicMapProps {
  clientId: string;
}

export function MetabolicMap({ clientId }: MetabolicMapProps) {
  const [data, setData] = useState<MetabolicMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get<MetabolicMapData>(`/api/metabolic-map/${clientId}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <Card>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  if (!data?.map) return null;

  const systems = Object.entries(data.map);

  return (
    <View>
      <Text style={styles.sectionTitle}>Metabolic Engine Map</Text>

      <View style={styles.grid}>
        {systems.map(([key, system]) => {
          const config = SYSTEM_ICONS[key] || { icon: 'ellipse', color: colors.textTertiary };
          const signalColor = SIGNAL_COLORS[system.signal];
          const isExpanded = expanded === key;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.systemCard, isExpanded && styles.systemCardExpanded]}
              onPress={() => setExpanded(isExpanded ? null : key)}
              activeOpacity={0.7}
            >
              <View style={styles.systemHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${config.color}20` }]}>
                  <Ionicons name={config.icon} size={20} color={config.color} />
                </View>
                <View style={styles.systemInfo}>
                  <Text style={styles.systemLabel}>{system.label}</Text>
                  <View style={styles.signalRow}>
                    <View style={[styles.signalDot, { backgroundColor: signalColor }]} />
                    <Text style={[styles.signalText, { color: signalColor }]}>
                      {SIGNAL_LABELS[system.signal]}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: system.status === 'active' ? `${config.color}20` : `${colors.textTertiary}20` }]}>
                  <Text style={[styles.statusText, { color: system.status === 'active' ? config.color : colors.textTertiary }]}>
                    {system.status === 'active' ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.metricsContainer}>
                  {Object.entries(system.metrics).map(([mk, mv]) => {
                    if (mv == null || (typeof mv === 'object' && !Array.isArray(mv) && mv !== null)) return null;
                    if (Array.isArray(mv)) {
                      if (mv.length === 0) return null;
                      return (
                        <View key={mk} style={styles.metricRow}>
                          <Text style={styles.metricLabel}>{formatLabel(mk)}</Text>
                          <Text style={styles.metricValue}>{mv.length} items</Text>
                        </View>
                      );
                    }
                    return (
                      <View key={mk} style={styles.metricRow}>
                        <Text style={styles.metricLabel}>{formatLabel(mk)}</Text>
                        <Text style={styles.metricValue}>{String(mv)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace('7d', '(7d)')
    .replace('Avg ', 'Avg. ');
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.sm,
  },
  systemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  systemCardExpanded: {
    borderColor: colors.accent,
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemInfo: {
    flex: 1,
  },
  systemLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  signalText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
