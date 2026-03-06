import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CoachPicker } from '../../components/admin/CoachPicker';
import { Client, Checkin, ClientMetrics, OrgCoach } from '../../types';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

interface ClientDetailData {
  client: Client & {
    client_coach_assignments: {
      coach_user_id: string;
      is_active: boolean;
      profiles: { full_name: string | null; email: string } | null;
    }[];
  };
  checkins: Checkin[];
  metrics: ClientMetrics | null;
}

export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ClientDetailData | null>(null);
  const [coaches, setCoaches] = useState<OrgCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [detail, coachRes] = await Promise.all([
        api.get<ClientDetailData>(`/api/admin/clients/${id}`),
        api.get<{ coaches: OrgCoach[] }>('/api/admin/coaches'),
      ]);
      setData(detail);
      setCoaches(coachRes.coaches);
    } catch (err) {
      console.error('Client detail error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleReassign = async (coachUserId: string) => {
    if (!id) return;
    setReassigning(true);
    try {
      await api.put('/api/admin/assignments', { client_id: id, coach_user_id: coachUserId });
      setShowReassign(false);
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Reassignment failed');
    } finally {
      setReassigning(false);
    }
  };

  const handleToggleActive = async () => {
    if (!data) return;
    const newStatus = !data.client.is_active;
    const action = newStatus ? 'reactivate' : 'deactivate';

    Alert.alert(
      `${newStatus ? 'Reactivate' : 'Deactivate'} Client`,
      `Are you sure you want to ${action} ${data.client.first_name} ${data.client.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Reactivate' : 'Deactivate',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            setToggling(true);
            try {
              await api.patch(`/api/admin/clients/${id}`, { is_active: newStatus });
              await fetchData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
            } finally {
              setToggling(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !data) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing.xxxl }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const { client, checkins, metrics } = data;
  const activeAssignment = client.client_coach_assignments?.find(a => a.is_active);
  const currentCoachId = activeAssignment?.coach_user_id ?? null;
  const coachName = activeAssignment?.profiles?.full_name || 'Unassigned';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Client Detail</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <Card>
          <View style={styles.clientHeader}>
            <View>
              <Text style={styles.clientName}>
                {client.first_name} {client.last_name}
              </Text>
              {client.email && <Text style={styles.clientEmail}>{client.email}</Text>}
              {client.phone && <Text style={styles.clientEmail}>{client.phone}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: client.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Text style={[styles.statusText, { color: client.is_active ? colors.green : colors.red }]}>
                {client.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Coach Assignment</Text>
          <View style={styles.coachRow}>
            <Text style={styles.coachName}>{coachName}</Text>
            <Button
              title={showReassign ? 'Cancel' : 'Reassign'}
              variant="secondary"
              onPress={() => setShowReassign(!showReassign)}
              style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
            />
          </View>
          {showReassign && (
            <View style={{ marginTop: spacing.md }}>
              <CoachPicker
                coaches={coaches}
                selectedId={currentCoachId}
                onSelect={handleReassign}
                loading={reassigning}
              />
            </View>
          )}
        </Card>

        {metrics && (
          <Card>
            <Text style={styles.sectionLabel}>Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricRow label="Status" value={metrics.status} />
              <MetricRow label="Adherence (7d)" value={metrics.adherence_7d != null ? `${Math.round(metrics.adherence_7d)}%` : '–'} />
              <MetricRow label="Avg Calories" value={metrics.avg_calories_7d != null ? `${Math.round(metrics.avg_calories_7d)}` : '–'} />
              <MetricRow label="Avg Protein" value={metrics.avg_protein_7d != null ? `${Math.round(metrics.avg_protein_7d)}g` : '–'} />
              <MetricRow label="Avg Steps" value={metrics.avg_steps_7d != null ? `${Math.round(metrics.avg_steps_7d)}` : '–'} />
              <MetricRow label="Weight" value={metrics.weight_current != null ? `${metrics.weight_current} lbs` : '–'} />
            </View>
          </Card>
        )}

        <Card>
          <Text style={styles.sectionLabel}>Targets</Text>
          <View style={styles.metricsGrid}>
            <MetricRow label="Calories" value={client.target_calories?.toString() || '–'} />
            <MetricRow label="Protein" value={client.target_protein ? `${client.target_protein}g` : '–'} />
            <MetricRow label="Steps" value={client.target_steps?.toString() || '–'} />
            <MetricRow label="Weigh-in Day" value={client.weigh_in_day} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionLabel}>Recent Check-ins ({checkins.length})</Text>
          {checkins.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins yet</Text>
          ) : (
            checkins.slice(0, 10).map(ci => (
              <View key={ci.id} style={styles.checkinRow}>
                <Text style={styles.checkinDate}>{ci.date}</Text>
                <View style={styles.checkinDetails}>
                  {ci.weight_lbs && <Text style={styles.checkinDetail}>{ci.weight_lbs} lbs</Text>}
                  {ci.calories && <Text style={styles.checkinDetail}>{ci.calories} cal</Text>}
                  {ci.steps && <Text style={styles.checkinDetail}>{ci.steps} steps</Text>}
                </View>
              </View>
            ))
          )}
        </Card>

        <Button
          title={client.is_active ? 'Deactivate Client' : 'Reactivate Client'}
          variant={client.is_active ? 'ghost' : 'secondary'}
          onPress={handleToggleActive}
          loading={toggling}
          textStyle={client.is_active ? { color: colors.red } : undefined}
        />

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clientEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  metricsGrid: {
    gap: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  checkinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkinDate: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  checkinDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  checkinDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
});
