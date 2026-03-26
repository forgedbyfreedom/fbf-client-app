import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodLogEntry } from '../../types';
import { Input } from '../ui/Input';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface EditFoodModalProps {
  visible: boolean;
  entry: FoodLogEntry | null;
  onSave: (id: string, updates: Partial<FoodLogEntry>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const QUANTITY_PRESETS = [0.5, 1, 1.5, 2];

export function EditFoodModal({ visible, entry, onSave, onDelete, onClose }: EditFoodModalProps) {
  const [name, setName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [baseCals, setBaseCals] = useState(0);
  const [baseProtein, setBaseProtein] = useState(0);
  const [baseCarbs, setBaseCarbs] = useState(0);
  const [baseFat, setBaseFat] = useState(0);

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setServingSize(entry.serving_size);
      setQuantity(entry.quantity);
      setBaseCals(entry.calories);
      setBaseProtein(entry.protein_g);
      setBaseCarbs(entry.carbs_g);
      setBaseFat(entry.fat_g);
    }
  }, [entry]);

  if (!entry) return null;

  const effectiveCals = Math.round(baseCals * quantity);
  const effectiveProtein = Math.round(baseProtein * quantity);
  const effectiveCarbs = Math.round(baseCarbs * quantity);
  const effectiveFat = Math.round(baseFat * quantity);

  const handleSave = () => {
    onSave(entry.id, {
      name,
      serving_size: servingSize,
      quantity,
      calories: baseCals,
      protein_g: baseProtein,
      carbs_g: baseCarbs,
      fat_g: baseFat,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(entry.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Food</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Input
              label="Food Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grilled Chicken Breast"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Serving Size"
                  value={servingSize}
                  onChangeText={setServingSize}
                  placeholder="e.g. 8 oz"
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
              {QUANTITY_PRESETS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quantityBtn, quantity === q && styles.quantityBtnActive]}
                  onPress={() => setQuantity(q)}
                >
                  <Text
                    style={[
                      styles.quantityBtnText,
                      quantity === q && styles.quantityBtnTextActive,
                    ]}
                  >
                    {q}x
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.customQuantity}>
                <Input
                  value={String(quantity)}
                  onChangeText={(t) => {
                    const val = parseFloat(t);
                    if (!isNaN(val) && val > 0) setQuantity(val);
                    else if (t === '') setQuantity(0);
                  }}
                  keyboardType="decimal-pad"
                  style={styles.quantityInput}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Base Macros (per serving)</Text>
            <View style={styles.macroGrid}>
              <View style={styles.macroField}>
                <Input
                  label="Calories"
                  value={String(baseCals)}
                  onChangeText={(t) => setBaseCals(parseFloat(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroField}>
                <Input
                  label="Protein (g)"
                  value={String(baseProtein)}
                  onChangeText={(t) => setBaseProtein(parseFloat(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroField}>
                <Input
                  label="Carbs (g)"
                  value={String(baseCarbs)}
                  onChangeText={(t) => setBaseCarbs(parseFloat(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroField}>
                <Input
                  label="Fat (g)"
                  value={String(baseFat)}
                  onChangeText={(t) => setBaseFat(parseFloat(t) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.effectiveMacros}>
              <Text style={styles.effectiveTitle}>Effective Macros ({quantity}x)</Text>
              <View style={styles.effectiveRow}>
                <View style={styles.effectiveItem}>
                  <Text style={styles.effectiveValue}>{effectiveCals}</Text>
                  <Text style={styles.effectiveLabel}>cal</Text>
                </View>
                <View style={styles.effectiveItem}>
                  <Text style={styles.effectiveValue}>{effectiveProtein}g</Text>
                  <Text style={styles.effectiveLabel}>protein</Text>
                </View>
                <View style={styles.effectiveItem}>
                  <Text style={styles.effectiveValue}>{effectiveCarbs}g</Text>
                  <Text style={styles.effectiveLabel}>carbs</Text>
                </View>
                <View style={styles.effectiveItem}>
                  <Text style={styles.effectiveValue}>{effectiveFat}g</Text>
                  <Text style={styles.effectiveLabel}>fat</Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteActionBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.red} />
                <Text style={styles.deleteBtnText}>Delete Food</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  quantityBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityBtnActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  quantityBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quantityBtnTextActive: {
    color: colors.accent,
  },
  customQuantity: {
    flex: 1,
  },
  quantityInput: {
    textAlign: 'center',
    minHeight: 40,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  macroField: {
    width: '48%',
  },
  effectiveMacros: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  effectiveTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  effectiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  effectiveItem: {
    alignItems: 'center',
  },
  effectiveValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  effectiveLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.red,
    paddingVertical: spacing.md,
  },
  deleteBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.red,
  },
});
