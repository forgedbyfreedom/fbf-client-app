import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface InventoryItem {
  id: string;
  peptide_name: string;
  dosage: string;
  quantity: number;
  supplier: string;
  order_date: string;
  tracking_number: string | null;
  courier: string | null;
  status: 'ordered' | 'shipped' | 'in_transit' | 'delivered' | 'in_stock' | 'low_stock' | 'out_of_stock';
  cost_per_vial: number | null;
  retail_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  ordered: '#3b82f6',
  shipped: '#8b5cf6',
  in_transit: '#D4A017',
  delivered: '#22c55e',
  in_stock: '#22c55e',
  low_stock: '#D4A017',
  out_of_stock: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  ordered: 'ORDERED',
  shipped: 'SHIPPED',
  in_transit: 'IN TRANSIT',
  delivered: 'DELIVERED',
  in_stock: 'IN STOCK',
  low_stock: 'LOW STOCK',
  out_of_stock: 'OUT OF STOCK',
};

const COURIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'China Post', 'YunExpress', '4PX', 'Other'];
const STATUSES: InventoryItem['status'][] = ['ordered', 'shipped', 'in_transit', 'delivered', 'in_stock', 'low_stock', 'out_of_stock'];

const TRACKING_URLS: Record<string, string> = {
  'USPS': 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  'UPS': 'https://www.ups.com/track?tracknum=',
  'FedEx': 'https://www.fedex.com/fedextrack/?trknbr=',
  'DHL': 'https://www.dhl.com/us-en/home/tracking/tracking-global-forwarding.html?submit=1&tracking-id=',
  '4PX': 'https://track.4px.com/#/result/0/',
  'YunExpress': 'https://www.yuntrack.com/parcelTracking?id=',
  'China Post': 'https://www.17track.net/en/track#nums=',
};

function getTrackingUrl(courier: string | null, trackingNumber: string | null): string | null {
  if (!courier || !trackingNumber) return null;
  const base = TRACKING_URLS[courier];
  if (base) return `${base}${trackingNumber}`;
  return `https://www.17track.net/en/track#nums=${trackingNumber}`;
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'tracking' | 'stock'>('all');

  // Form state
  const [form, setForm] = useState({
    peptide_name: '',
    dosage: '',
    quantity: '',
    supplier: '',
    order_date: '',
    tracking_number: '',
    courier: '',
    status: 'ordered' as InventoryItem['status'],
    cost_per_vial: '',
    retail_price: '',
    notes: '',
  });

  const fetchInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('peptide_inventory')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchInventory();
  }, [isAdmin, fetchInventory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  }, [fetchInventory]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      peptide_name: '', dosage: '', quantity: '', supplier: '', order_date: new Date().toISOString().split('T')[0],
      tracking_number: '', courier: '', status: 'ordered', cost_per_vial: '', retail_price: '', notes: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      peptide_name: item.peptide_name,
      dosage: item.dosage,
      quantity: String(item.quantity),
      supplier: item.supplier,
      order_date: item.order_date,
      tracking_number: item.tracking_number || '',
      courier: item.courier || '',
      status: item.status,
      cost_per_vial: item.cost_per_vial ? String(item.cost_per_vial) : '',
      retail_price: item.retail_price ? String(item.retail_price) : '',
      notes: item.notes || '',
    });
    setModalVisible(true);
  };

  const saveItem = async () => {
    if (!form.peptide_name || !form.dosage || !form.quantity) {
      Alert.alert('Required', 'Peptide name, dosage, and quantity are required.');
      return;
    }

    const payload = {
      peptide_name: form.peptide_name,
      dosage: form.dosage,
      quantity: parseInt(form.quantity, 10) || 0,
      supplier: form.supplier,
      order_date: form.order_date || new Date().toISOString().split('T')[0],
      tracking_number: form.tracking_number || null,
      courier: form.courier || null,
      status: form.status,
      cost_per_vial: form.cost_per_vial ? parseFloat(form.cost_per_vial) : null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('peptide_inventory')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('peptide_inventory')
          .insert(payload);
        if (error) throw error;
      }
      setModalVisible(false);
      fetchInventory();
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const deleteItem = (item: InventoryItem) => {
    Alert.alert('Delete', `Remove ${item.peptide_name} ${item.dosage}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('peptide_inventory').delete().eq('id', item.id);
          fetchInventory();
        },
      },
    ]);
  };

  if (!isAdmin) return null;

  const filteredItems = items.filter(item => {
    if (filter === 'tracking') return ['ordered', 'shipped', 'in_transit'].includes(item.status);
    if (filter === 'stock') return ['in_stock', 'low_stock', 'out_of_stock', 'delivered'].includes(item.status);
    return true;
  });

  const totalValue = items.reduce((sum, i) => sum + (i.retail_price || 0) * i.quantity, 0);
  const totalCost = items.reduce((sum, i) => sum + (i.cost_per_vial || 0) * i.quantity, 0);
  const inTransitCount = items.filter(i => ['ordered', 'shipped', 'in_transit'].includes(i.status)).length;
  const lowStockCount = items.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock').length;

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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'} Admin</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>📦</Text>
          <Text style={styles.title}>Peptide Inventory</Text>
          <Text style={styles.subtitle}>Owner access only — Bryan & Wendy</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#D4A017' }]}>{inTransitCount}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: lowStockCount > 0 ? '#ef4444' : '#22c55e' }]}>{lowStockCount}</Text>
            <Text style={styles.statLabel}>Low/Out</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { fontSize: fontSize.lg }]}>${totalCost.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Cost</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { fontSize: fontSize.lg, color: '#22c55e' }]}>${totalValue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Retail Value</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, { fontSize: fontSize.lg, color: colors.accent }]}>${(totalValue - totalCost).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Margin</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(['all', 'tracking', 'stock'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'tracking' ? 'In Transit' : 'In Stock'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inventory cards */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No inventory items yet</Text>
            <Text style={styles.emptySub}>Tap + to add your first order</Text>
          </View>
        ) : (
          filteredItems.map(item => {
            const trackUrl = getTrackingUrl(item.courier, item.tracking_number);
            const statusColor = STATUS_COLORS[item.status] || colors.textTertiary;
            return (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => openEditModal(item)} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.peptide_name}</Text>
                    <Text style={styles.cardDosage}>{item.dosage} — Qty: {item.quantity}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <Text style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Supplier: </Text>
                    <Text style={styles.detailValue}>{item.supplier || '—'}</Text>
                  </Text>
                  <Text style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ordered: </Text>
                    <Text style={styles.detailValue}>{item.order_date}</Text>
                  </Text>
                  {item.cost_per_vial != null && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cost: </Text>
                      <Text style={styles.detailValue}>${item.cost_per_vial}/vial</Text>
                      {item.retail_price != null && (
                        <Text style={[styles.detailValue, { color: '#22c55e' }]}> → ${item.retail_price} retail</Text>
                      )}
                    </Text>
                  )}
                </View>

                {item.tracking_number ? (
                  <TouchableOpacity
                    style={styles.trackingRow}
                    onPress={() => trackUrl && Linking.openURL(trackUrl)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate-outline" size={16} color={colors.accent} />
                    <Text style={styles.trackingText} numberOfLines={1}>
                      {item.courier ? `${item.courier}: ` : ''}{item.tracking_number}
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}

                {item.notes ? (
                  <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
                ) : null}

                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditModal(item)}>
                    <Ionicons name="create-outline" size={20} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteItem(item)}>
                    <Ionicons name="trash-outline" size={20} color={colors.red} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? 60 : 20 }]}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add Inventory'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Peptide Name *</Text>
            <TextInput style={styles.input} value={form.peptide_name} onChangeText={v => setForm({ ...form, peptide_name: v })} placeholder="e.g. Retatrutide" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.fieldLabel}>Dosage *</Text>
            <TextInput style={styles.input} value={form.dosage} onChangeText={v => setForm({ ...form, dosage: v })} placeholder="e.g. 30mg" placeholderTextColor={colors.textTertiary} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Quantity *</Text>
                <TextInput style={styles.input} value={form.quantity} onChangeText={v => setForm({ ...form, quantity: v })} placeholder="10" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Order Date</Text>
                <TextInput style={styles.input} value={form.order_date} onChangeText={v => setForm({ ...form, order_date: v })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Supplier / Company</Text>
            <TextInput style={styles.input} value={form.supplier} onChangeText={v => setForm({ ...form, supplier: v })} placeholder="e.g. WWB China" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.fieldLabel}>Tracking Number</Text>
            <TextInput style={styles.input} value={form.tracking_number} onChangeText={v => setForm({ ...form, tracking_number: v })} placeholder="Enter tracking number" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.fieldLabel}>Courier</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
              {COURIERS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, form.courier === c && styles.chipActive]} onPress={() => setForm({ ...form, courier: c })}>
                  <Text style={[styles.chipText, form.courier === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
              {STATUSES.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, form.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]} onPress={() => setForm({ ...form, status: s })}>
                  <Text style={[styles.chipText, form.status === s && { color: '#fff' }]}>{STATUS_LABELS[s]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Cost/Vial ($)</Text>
                <TextInput style={styles.input} value={form.cost_per_vial} onChangeText={v => setForm({ ...form, cost_per_vial: v })} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Retail Price ($)</Text>
                <TextInput style={styles.input} value={form.retail_price} onChangeText={v => setForm({ ...form, retail_price: v })} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.notes} onChangeText={v => setForm({ ...form, notes: v })} placeholder="Order notes, batch info, etc." placeholderTextColor={colors.textTertiary} multiline />

            <TouchableOpacity style={styles.saveBtn} onPress={saveItem} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Add to Inventory'}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtn: { marginBottom: spacing.md },
  backText: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  headerIcon: { fontSize: 36, marginBottom: spacing.sm },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.accent },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#0a0a0a' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary },
  emptySub: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  cardDosage: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
  statusBadge: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, marginLeft: spacing.sm },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardDetails: { marginBottom: spacing.sm },
  detailRow: { fontSize: fontSize.sm, marginBottom: 3 },
  detailLabel: { color: colors.textTertiary },
  detailValue: { color: colors.textSecondary },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,106,0,0.08)', borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  trackingText: { flex: 1, fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },
  cardNotes: { fontSize: fontSize.xs, color: colors.textTertiary, fontStyle: 'italic', marginBottom: spacing.sm },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalContent: { padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.textPrimary },
  row: { flexDirection: 'row', gap: spacing.md },
  chipScroll: { maxHeight: 44, marginBottom: spacing.xs },
  chipRow: { gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#0a0a0a' },
  saveBtn: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.xl },
  saveBtnText: { fontSize: fontSize.md, fontWeight: '800', color: '#0a0a0a' },
});
