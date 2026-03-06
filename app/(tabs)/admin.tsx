import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { StatCard } from '../../components/admin/StatCard';
import { QuickAddClientModal } from '../../components/admin/QuickAddClientModal';
import { AdminClient, OrgCoach } from '../../types';
import { colors, borderRadius, fontSize, spacing } from '../../lib/theme';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [coaches, setCoaches] = useState<OrgCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [clientsRes, coachesRes] = await Promise.all([
        api.get<{ clients: AdminClient[] }>('/api/admin/clients'),
        api.get<{ coaches: OrgCoach[] }>('/api/admin/coaches'),
      ]);
      setClients(clientsRes.clients);
      setCoaches(coachesRes.coaches);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (!isAdmin) return null;

  const activeClients = clients.filter(c => c.is_active).length;
  const redClients = clients.filter(c => c.client_metrics?.[0]?.status === 'red').length;

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + spacing.xxxl }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <Text style={styles.title}>Admin</Text>

        <View style={styles.statsRow}>
          <StatCard value={activeClients} label="Clients" />
          <StatCard value={coaches.length} label="Coaches" />
          <StatCard value={redClients} label="Attention" color={redClients > 0 ? colors.red : colors.textTertiary} />
        </View>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => setQuickAddVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={[styles.navIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="person-add" size={22} color={colors.green} />
            </View>
            <View>
              <Text style={styles.navTitle}>Quick Add Client</Text>
              <Text style={styles.navSub}>Name + coach, done in seconds</Text>
            </View>
          </View>
          <Ionicons name="add-circle-outline" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/admin/clients')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={[styles.navIcon, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="people" size={22} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.navTitle}>Manage Clients</Text>
              <Text style={styles.navSub}>{clients.length} total clients</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/admin/coaches')}
          activeOpacity={0.7}
        >
          <View style={styles.navLeft}>
            <View style={[styles.navIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="fitness" size={22} color={colors.green} />
            </View>
            <View>
              <Text style={styles.navTitle}>Manage Coaches</Text>
              <Text style={styles.navSub}>{coaches.length} team members</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => setQuickAddVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <QuickAddClientModal
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        coaches={coaches}
        onCreated={fetchData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  navSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
