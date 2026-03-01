import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { COMPOUND_CATEGORIES, ROUTE_OPTIONS } from '../../lib/constants';
import { PedItem } from '../../types';

interface CompoundLoggerProps {
  entries: PedItem[];
  onChange: (entries: PedItem[]) => void;
  clientPeds?: PedItem[];
}

export function CompoundLogger({ entries, onChange, clientPeds = [] }: CompoundLoggerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [newEntry, setNewEntry] = useState<PedItem>({
    compound: '',
    dose: '',
    frequency: '',
    route: 'IM injection',
  });

  const addEntry = (compound?: string) => {
    const entry = compound
      ? { ...newEntry, compound }
      : newEntry;
    if (!entry.compound) return;
    onChange([...entries, entry]);
    setNewEntry({ compound: '', dose: '', frequency: '', route: 'IM injection' });
    setShowPicker(false);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compound Log</Text>

      {/* Quick-add from assigned protocols */}
      {clientPeds.length > 0 && (
        <View style={styles.quickAdd}>
          <Text style={styles.subtitle}>Quick Add (Assigned)</Text>
          <View style={styles.chipRow}>
            {clientPeds.map((ped, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() =>
                  onChange([...entries, { ...ped }])
                }
              >
                <Text style={styles.chipText}>{ped.compound}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Current entries */}
      {entries.map((entry, i) => (
        <View key={i} style={styles.entry}>
          <View style={styles.entryInfo}>
            <Text style={styles.entryName}>{entry.compound}</Text>
            <Text style={styles.entryDetail}>
              {[entry.dose, entry.frequency, entry.route].filter(Boolean).join(' | ')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeEntry(i)}>
            <Text style={styles.removeBtn}>X</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Button
        title="+ Add Compound"
        variant="secondary"
        onPress={() => setShowPicker(true)}
      />

      {/* Compound picker modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Compound</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {Object.entries(COMPOUND_CATEGORIES).map(([category, compounds]) => (
              <View key={category} style={styles.category}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.chipRow}>
                  {compounds.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={styles.compoundChip}
                      onPress={() => {
                        setNewEntry((prev) => ({ ...prev, compound: c }));
                      }}
                    >
                      <Text
                        style={[
                          styles.compoundChipText,
                          newEntry.compound === c && styles.selectedChipText,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {newEntry.compound ? (
              <View style={styles.entryForm}>
                <Text style={styles.selectedLabel}>
                  Selected: {newEntry.compound}
                </Text>
                <Input
                  label="Dose"
                  value={newEntry.dose}
                  onChangeText={(t) =>
                    setNewEntry((p) => ({ ...p, dose: t }))
                  }
                  placeholder="e.g. 200mg"
                  containerStyle={styles.formInput}
                />
                <Input
                  label="Frequency"
                  value={newEntry.frequency}
                  onChangeText={(t) =>
                    setNewEntry((p) => ({ ...p, frequency: t }))
                  }
                  placeholder="e.g. 2x/week"
                  containerStyle={styles.formInput}
                />
                <Text style={styles.routeLabel}>Route</Text>
                <View style={styles.chipRow}>
                  {ROUTE_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.routeChip,
                        newEntry.route === r && styles.routeChipSelected,
                      ]}
                      onPress={() =>
                        setNewEntry((p) => ({ ...p, route: r }))
                      }
                    >
                      <Text
                        style={[
                          styles.routeChipText,
                          newEntry.route === r && styles.routeChipTextSelected,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button
                  title="Add"
                  onPress={() => addEntry()}
                  style={styles.addBtn}
                />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  quickAdd: {
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  entryDetail: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  removeBtn: {
    color: colors.red,
    fontSize: fontSize.md,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xxxl + 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    fontSize: fontSize.md,
    color: colors.accent,
  },
  modalBody: {
    flex: 1,
    padding: spacing.lg,
  },
  category: {
    marginBottom: spacing.xl,
  },
  categoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  compoundChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  compoundChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  selectedChipText: {
    color: colors.accent,
  },
  entryForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  selectedLabel: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  formInput: {
    marginBottom: spacing.md,
  },
  routeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  routeChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  routeChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  routeChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  routeChipTextSelected: {
    color: colors.accent,
  },
  addBtn: {
    marginTop: spacing.lg,
  },
});
