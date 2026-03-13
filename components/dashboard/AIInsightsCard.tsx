import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

const API_BASE = 'https://forged-by-freedom-api-nm4f.onrender.com';

interface Insight {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  icon: string;
  title: string;
  summary: string;
  action: string;
  metrics: Record<string, string | number | undefined>;
}

interface Props {
  clientId: string;
}

export function AIInsightsCard({ clientId }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [clientId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/client/${clientId}/ai-insights`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setInsights(data.insights || []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🧠</Text>
          <Text style={styles.headerTitle}>AI Coaching Insights</Text>
        </View>
        <ActivityIndicator color={colors.accent} style={{ padding: spacing.xl }} />
      </View>
    );
  }

  if (error || insights.length === 0) return null;

  const severityColors: Record<string, string> = {
    critical: colors.red,
    warning: colors.yellow,
    info: '#3b82f6',
    positive: colors.green,
  };

  const severityLabels: Record<string, string> = {
    critical: 'ACTION NEEDED',
    warning: 'WATCH',
    info: 'TIP',
    positive: 'ON TRACK',
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🧠</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI Coaching Insights</Text>
          <Text style={styles.headerSub}>Based on your recent check-ins</Text>
        </View>
        {insights.filter(i => i.severity === 'critical').length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <Text style={[styles.countText, { color: colors.red }]}>
              {insights.filter(i => i.severity === 'critical').length}
            </Text>
          </View>
        )}
      </View>

      {insights.map((insight) => {
        const isExpanded = expanded === insight.id;
        const sColor = severityColors[insight.severity] || colors.textSecondary;

        return (
          <TouchableOpacity
            key={insight.id}
            style={[styles.insightRow, { borderLeftColor: sColor }]}
            onPress={() => setExpanded(isExpanded ? null : insight.id)}
            activeOpacity={0.7}
          >
            <View style={styles.insightHeader}>
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.insightTitleRow}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: `${sColor}20` }]}>
                    <Text style={[styles.severityText, { color: sColor }]}>
                      {severityLabels[insight.severity]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.insightSummary}>{insight.summary}</Text>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.actionBox}>
                <Text style={styles.actionLabel}>RECOMMENDED ACTION</Text>
                <Text style={styles.actionText}>{insight.action}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  headerSub: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  insightRow: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  insightTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  insightSummary: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  actionBox: {
    marginTop: spacing.md,
    marginLeft: 26,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  actionText: {
    color: '#ccc',
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
});
