import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface CoachAlert {
  id: string;
  client_id: string;
  client_name: string;
  tier: 'urgent' | 'warning' | 'info';
  category: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TIER_CONFIG = {
  urgent: { color: colors.red, icon: 'alert-circle' as const, label: 'URGENT' },
  warning: { color: colors.yellow, icon: 'warning' as const, label: 'WARNING' },
  info: { color: colors.accent, icon: 'information-circle' as const, label: 'INFO' },
};

interface AlertFeedProps {
  onClientPress?: (clientId: string) => void;
}

export function AlertFeed({ onClientPress }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<CoachAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = filter ? `?tier=${filter}` : '';
      const res = await api.get<{ alerts: CoachAlert[] }>(`/api/coach/alerts${params}`);
      setAlerts(res.alerts);
    } catch {
      // Endpoint not yet implemented — show empty state
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markRead = async (alertId: string) => {
    try {
      await api.patch(`/api/coach/alerts/${alertId}/read`, {});
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/coach/alerts/read-all', {});
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    } catch {
      // silent
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const renderAlert = ({ item }: { item: CoachAlert }) => {
    const tier = TIER_CONFIG[item.tier];
    return (
      <TouchableOpacity
        style={[styles.alertItem, !item.is_read && styles.alertUnread]}
        onPress={() => {
          markRead(item.id);
          onClientPress?.(item.client_id);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.tierBadge, { backgroundColor: `${tier.color}20` }]}>
          <Ionicons name={tier.icon} size={18} color={tier.color} />
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Text style={[styles.alertClient, !item.is_read && { color: colors.textPrimary }]}>
              {item.client_name}
            </Text>
            <Text style={styles.alertTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.alertMessage}>{item.message}</Text>
          <Text style={[styles.alertCategory, { color: tier.color }]}>
            {tier.label} · {item.category.replace('_', ' ')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Card>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Alerts</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {[null, 'urgent', 'warning', 'info'].map((tier) => (
          <TouchableOpacity
            key={tier ?? 'all'}
            style={[styles.filterPill, filter === tier && styles.filterPillActive]}
            onPress={() => setFilter(tier)}
          >
            <Text style={[styles.filterText, filter === tier && styles.filterTextActive]}>
              {tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {alerts.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No alerts</Text>
        </Card>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  markAllRead: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  filterText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  alertUnread: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 106, 0, 0.05)',
  },
  tierBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertClient: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  alertTime: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  alertCategory: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
