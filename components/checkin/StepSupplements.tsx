import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { CompoundLogger } from './CompoundLogger';
import { colors, fontSize, spacing } from '../../lib/theme';

// Same per-day store the Protocol tab uses, so a tap in either place shows in both.
const todayKey = () => {
  const d = new Date();
  return `fbf_supplement_log_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Row { key: string; name: string; detail: string; kind: 'supplement' | 'peptide' | 'ped' | 'medical'; dose: string; frequency: string; route: string }

export function StepSupplements() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();
  const [taken, setTaken] = useState<Record<string, boolean>>({});

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const x of client?.current_supplements ?? []) out.push({ key: `supplement_${x.name}`, name: x.name, detail: [x.dose, x.frequency].filter(Boolean).join(' · '), kind: 'supplement', dose: x.dose, frequency: x.frequency, route: 'Oral' });
    for (const x of client?.current_peptides ?? []) out.push({ key: `peptide_${x.name}`, name: x.name, detail: [x.dose, x.frequency].filter(Boolean).join(' · '), kind: 'peptide', dose: x.dose, frequency: x.frequency, route: 'SubQ injection' });
    for (const x of client?.current_peds ?? []) out.push({ key: `ped_${x.compound}`, name: x.compound, detail: [x.dose, x.frequency].filter(Boolean).join(' · '), kind: 'ped', dose: x.dose, frequency: x.frequency, route: x.route });
    for (const x of (client?.medical_protocol ?? []) as any[]) out.push({ key: `medical_${x.name}`, name: x.name, detail: [x.dose, x.frequency].filter(Boolean).join(' · '), kind: 'medical', dose: x.dose ?? '', frequency: x.frequency ?? '', route: x.route ?? 'Oral' });
    return out;
  }, [client]);

  useEffect(() => {
    AsyncStorage.getItem(todayKey()).then((v) => { if (v) { try { setTaken(JSON.parse(v)); } catch {} } }).catch(() => {});
  }, []);

  const apply = useCallback((next: Record<string, boolean>) => {
    setTaken(next);
    AsyncStorage.setItem(todayKey(), JSON.stringify(next)).catch(() => {});
    // Overall flag = every assigned supplement ticked individually.
    const supps = rows.filter((r) => r.kind === 'supplement');
    const allSupps = supps.length > 0 && supps.every((r) => next[r.key]);
    // Each peptide / compound / medical item ticked is logged as its own entry.
    const logged = rows.filter((r) => r.kind !== 'supplement' && next[r.key]).map((r) => ({ compound: r.name, dose: r.dose || '', frequency: r.frequency || '', route: r.route || '' }));
    const manual = form.ped_log_json.filter((e) => !rows.some((r) => r.kind !== 'supplement' && r.name === e.compound));
    updateForm({ supplement_compliance: allSupps, ped_log_json: [...manual, ...logged] });
  }, [rows, form.ped_log_json, updateForm]);

  const toggle = (key: string) => apply({ ...taken, [key]: !taken[key] });
  const allDone = rows.length > 0 && rows.every((r) => taken[r.key]);
  const setAll = () => {
    const next = { ...taken };
    for (const r of rows) next[r.key] = !allDone;
    apply(next);
  };

  return (
    <View>
      <View style={{ backgroundColor: 'rgba(212, 169, 58, 0.08)', borderWidth: 1, borderColor: 'rgba(212, 169, 58, 0.2)', borderRadius: 8, padding: 10, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, color: '#888', lineHeight: 16 }}>
          ⚠️ Compound and supplement logging is for personal tracking in an educational context only. Not a recommendation for human use. Consult a healthcare provider.
        </Text>
      </View>
      {rows.length > 0 ? (
        <View style={styles.protocolSection}>
          <View style={styles.rowHead}>
            <Text style={styles.protocolTitle}>What did you take today?</Text>
            <TouchableOpacity onPress={setAll} accessibilityRole="button">
              <Text style={styles.markAll}>{allDone ? 'Clear all' : 'Mark all'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sublabel}>Tap each one you took. Nothing is checked for you.</Text>
          {rows.map((r) => {
            const on = !!taken[r.key];
            return (
              <TouchableOpacity key={r.key} style={[styles.item, on && styles.itemOn]} onPress={() => toggle(r.key)} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.green : colors.textTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{r.name}</Text>
                  {!!r.detail && <Text style={styles.itemDetail}>{r.detail}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.sublabel, { marginBottom: spacing.lg }]}>Nothing assigned yet. Log what you took below.</Text>
      )}

      <CompoundLogger
        entries={form.ped_log_json}
        onChange={(entries) => updateForm({ ped_log_json: entries })}
        clientPeds={client?.current_peds}
      />

      <Input
        label="Side Effects / Notes"
        value={form.side_effects_notes}
        onChangeText={(t) => updateForm({ side_effects_notes: t })}
        placeholder="Any side effects, reactions, or notes..."
        multiline
        numberOfLines={3}
        containerStyle={styles.field}
        style={styles.multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  markAll: { fontSize: fontSize.sm, color: colors.accentText, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  itemOn: { opacity: 1 },
  itemName: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '600' },
  itemDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  protocolSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  protocolTitle: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  protocolItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  field: {
    marginBottom: spacing.lg,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
