import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { PedItem } from '../../types';
import {
  COMPOUND_GROUPS,
  COMPOUND_UNITS,
  COMPOUND_ROUTES,
  COMPOUND_FREQUENCIES,
  CompoundUnit,
  findCompound,
  formatDose,
  groupOf,
  parseDose,
} from '../../lib/compounds';

interface CompoundLoggerProps {
  entries: PedItem[];
  onChange: (entries: PedItem[]) => void;
  clientPeds?: PedItem[];
}

const OTHER = '__other__';

interface Draft {
  group: string;
  compound: string; // catalog name, or OTHER
  custom: string; // typed name when compound === OTHER
  amount: string;
  unit: CompoundUnit;
  frequency: string;
  route: string;
  notes: string;
}

const blankDraft = (group = COMPOUND_GROUPS[0].key): Draft => {
  // Pre-pick the unit and route typical for this group (first compound's).
  const lead = (COMPOUND_GROUPS.find((g) => g.key === group) ?? COMPOUND_GROUPS[0]).compounds[0];
  return {
    group,
    compound: '',
    custom: '',
    amount: '',
    unit: lead.unit,
    frequency: '',
    route: lead.route,
    notes: '',
  };
};

export function CompoundLogger({ entries, onChange, clientPeds = [] }: CompoundLoggerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const group = COMPOUND_GROUPS.find((g) => g.key === draft.group) ?? COMPOUND_GROUPS[0];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? group.compounds.filter((c) => c.name.toLowerCase().includes(q)) : group.compounds;
  }, [group, query]);

  const grouped = useMemo(() => {
    const out: { label: string; items: { entry: PedItem; index: number }[] }[] = [];
    entries.forEach((entry, index) => {
      const label = groupOf(entry.compound)?.label ?? 'Other';
      let bucket = out.find((b) => b.label === label);
      if (!bucket) {
        bucket = { label, items: [] };
        out.push(bucket);
      }
      bucket.items.push({ entry, index });
    });
    const order = COMPOUND_GROUPS.map((g) => g.label);
    return out.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }, [entries]);

  const reset = () => {
    setDraft(blankDraft());
    setEditing(null);
    setListOpen(false);
    setQuery('');
    setError(null);
  };

  const closeForm = () => {
    reset();
    setOpen(false);
  };

  const pickGroup = (key: string) => {
    setDraft({ ...blankDraft(key), notes: draft.notes });
    setListOpen(false);
    setQuery('');
    setError(null);
  };

  const pickCompound = (name: string) => {
    if (name === OTHER) {
      setDraft((d) => ({ ...d, compound: OTHER }));
    } else {
      const def = findCompound(name);
      setDraft((d) => ({
        ...d,
        compound: name,
        custom: '',
        unit: def?.unit ?? d.unit,
        route: def?.route ?? d.route,
      }));
    }
    setListOpen(false);
    setQuery('');
    setError(null);
  };

  const startEdit = (index: number) => {
    const e = entries[index];
    const def = findCompound(e.compound);
    const g = groupOf(e.compound);
    const { amount, unit } = parseDose(e.dose);
    setDraft({
      group: g?.key ?? 'other',
      compound: def ? def.name : OTHER,
      custom: def ? '' : e.compound,
      amount,
      unit: unit ?? def?.unit ?? 'mg',
      frequency: e.frequency || '',
      route: e.route || def?.route || 'IM injection',
      notes: e.notes ?? '',
    });
    setEditing(index);
    setOpen(true);
  };

  const submit = (another: boolean) => {
    const name = draft.compound === OTHER ? draft.custom.trim() : draft.compound;
    if (!name) {
      setError('Pick a compound, or choose "Other" and type its name.');
      return;
    }
    const amt = parseFloat(draft.amount.replace(',', '.'));
    if (!draft.amount.trim() || !isFinite(amt) || amt <= 0) {
      setError('Enter the amount as a number, like 250 or 2.5.');
      return;
    }
    const item: PedItem = {
      compound: name,
      dose: formatDose(String(amt), draft.unit),
      frequency: draft.frequency,
      route: draft.route,
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    };
    if (editing !== null) {
      onChange(entries.map((e, i) => (i === editing ? item : e)));
    } else {
      onChange([...entries, item]);
    }
    if (another) {
      const keepGroup = draft.group;
      reset();
      setDraft(blankDraft(keepGroup));
    } else {
      closeForm();
    }
  };

  const remove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
    if (editing === index) reset();
  };

  const already = (ped: PedItem) => entries.some((e) => e.compound === ped.compound && e.dose === ped.dose);

  const selectedLabel =
    draft.compound === OTHER ? 'Other (type it in)' : draft.compound || `Choose from ${group.label.toLowerCase()}`;

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Compound log</Text>
        <Text style={styles.count}>{entries.length === 0 ? 'Nothing logged' : `${entries.length} logged`}</Text>
      </View>

      {clientPeds.length > 0 && (
        <View style={styles.assigned}>
          <Text style={styles.sectionLabel}>From your coach</Text>
          <View style={styles.chipRow}>
            {clientPeds.map((ped, i) => {
              const done = already(ped);
              return (
                <TouchableOpacity
                  key={`${ped.compound}-${i}`}
                  style={[styles.assignedChip, done && styles.assignedChipDone]}
                  disabled={done}
                  onPress={() => onChange([...entries, { ...ped }])}
                  accessibilityRole="button"
                  accessibilityLabel={`${done ? 'Logged' : 'Log'} ${ped.compound} ${ped.dose}`}
                >
                  <Text style={[styles.assignedText, done && styles.assignedTextDone]}>
                    {done ? '✓ ' : '+ '}
                    {ped.compound}
                    {ped.dose ? ` · ${ped.dose}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {grouped.map((g) => (
        <View key={g.label} style={styles.groupBlock}>
          <Text style={styles.sectionLabel}>{g.label}</Text>
          {g.items.map(({ entry, index }) => (
            <TouchableOpacity
              key={index}
              style={[styles.entry, editing === index && styles.entryEditing]}
              onPress={() => startEdit(index)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${entry.compound}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName}>{entry.compound}</Text>
                <Text style={styles.entryDetail}>
                  {[entry.dose, entry.frequency, entry.route].filter(Boolean).join('  ·  ')}
                </Text>
                {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() => remove(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${entry.compound}`}
              >
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {!open ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={styles.addBtnText}>+ Add compound</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.form}>
          <View style={styles.formHead}>
            <Text style={styles.formTitle}>{editing !== null ? 'Edit entry' : 'Add compound'}</Text>
            <TouchableOpacity onPress={closeForm} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {COMPOUND_GROUPS.map((g) => {
              const on = g.key === draft.group;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.tab, on && styles.tabOn]}
                  onPress={() => pickGroup(g.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{g.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Compound</Text>
          <TouchableOpacity
            style={[styles.select, listOpen && styles.selectOpen]}
            onPress={() => setListOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Choose compound"
          >
            <Text style={[styles.selectText, !draft.compound && { color: colors.textTertiary }]} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <Text style={styles.caret}>{listOpen ? '▴' : '▾'}</Text>
          </TouchableOpacity>

          {listOpen && (
            <View style={styles.dropdown}>
              {group.compounds.length > 8 && (
                <TextInput
                  style={styles.search}
                  placeholder={`Search ${group.label.toLowerCase()}`}
                  placeholderTextColor={colors.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
              <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {visible.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[styles.option, draft.compound === c.name && styles.optionOn]}
                    onPress={() => pickCompound(c.name)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.optionText, draft.compound === c.name && styles.optionTextOn]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.option} onPress={() => pickCompound(OTHER)} accessibilityRole="button">
                  <Text style={[styles.optionText, { color: colors.accentText }]}>Other (type it in)</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {draft.compound === OTHER && (
            <TextInput
              style={[styles.input, { marginTop: spacing.sm }]}
              placeholder="Compound name"
              placeholderTextColor={colors.textTertiary}
              value={draft.custom}
              onChangeText={(t) => setDraft((d) => ({ ...d, custom: t }))}
              autoCapitalize="words"
            />
          )}

          <Text style={styles.fieldLabel}>Amount per dose</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="e.g. 250"
              placeholderTextColor={colors.textTertiary}
              value={draft.amount}
              onChangeText={(t) => setDraft((d) => ({ ...d, amount: t.replace(/[^0-9.,]/g, '') }))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel="Amount per dose"
            />
            <View style={styles.unitRow}>
              {COMPOUND_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unit, draft.unit === u && styles.chipOn]}
                  onPress={() => setDraft((d) => ({ ...d, unit: u }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: draft.unit === u }}
                >
                  <Text style={[styles.chipText, draft.unit === u && styles.chipTextOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.fieldLabel}>How often</Text>
          <View style={styles.chipRow}>
            {COMPOUND_FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, draft.frequency === f && styles.chipOn]}
                onPress={() => setDraft((d) => ({ ...d, frequency: d.frequency === f ? '' : f }))}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.frequency === f }}
              >
                <Text style={[styles.chipText, draft.frequency === f && styles.chipTextOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Route</Text>
          <View style={styles.chipRow}>
            {COMPOUND_ROUTES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, draft.route === r && styles.chipOn]}
                onPress={() => setDraft((d) => ({ ...d, route: r }))}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.route === r }}
              >
                <Text style={[styles.chipText, draft.route === r && styles.chipTextOn]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            placeholder="Brand or source, injection site, how it felt…"
            placeholderTextColor={colors.textTertiary}
            value={draft.notes}
            onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.primary} onPress={() => submit(false)} accessibilityRole="button">
            <Text style={styles.primaryText}>{editing !== null ? 'Save changes' : 'Add to log'}</Text>
          </TouchableOpacity>
          {editing === null && (
            <TouchableOpacity style={styles.secondary} onPress={() => submit(true)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Add and log another</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  count: { fontSize: fontSize.xs, color: colors.textTertiary },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  assigned: { marginBottom: spacing.lg },
  groupBlock: { marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  assignedChip: {
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  assignedChipDone: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  assignedText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: '500' },
  assignedTextDone: { color: colors.textTertiary },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  entryEditing: { borderColor: colors.accent },
  entryName: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '600' },
  entryDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  entryNotes: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 4 },
  removeBtn: { color: colors.textTertiary, fontSize: fontSize.lg, paddingHorizontal: spacing.sm },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.borderAccent,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  addBtnText: { color: colors.accentText, fontSize: fontSize.md, fontWeight: '600' },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.lg + 2,
  },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  cancel: { color: colors.textSecondary, fontSize: fontSize.sm },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  tabRow: { gap: spacing.sm, paddingRight: spacing.lg },
  tab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
  },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500' },
  tabTextOn: { color: colors.onAccent, fontWeight: '700' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  selectOpen: { borderColor: colors.accent },
  selectText: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  caret: { color: colors.accentText, fontSize: fontSize.md, marginLeft: spacing.sm },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  search: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: { paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionOn: { backgroundColor: colors.accentMuted },
  optionText: { color: colors.textPrimary, fontSize: fontSize.md },
  optionTextOn: { color: colors.accentText, fontWeight: '600' },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    minHeight: 48,
  },
  amountRow: { gap: spacing.sm },
  amountInput: { fontSize: fontSize.xl, fontWeight: '600' },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  unit: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    minWidth: 52,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  chipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  chipTextOn: { color: colors.accentText, fontWeight: '600' },
  notes: { minHeight: 64, textAlignVertical: 'top' },
  error: { color: colors.red, fontSize: fontSize.sm, marginTop: spacing.md },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryText: { color: colors.onAccent, fontSize: fontSize.md, fontWeight: '700' },
  secondary: { paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
  secondaryText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: '600' },
});
