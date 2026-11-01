import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useHydration, OZ_TO_ML } from '../../hooks/useHydration';
import { SectionCard, DisplayText } from '../ui/SectionCard';
import { colors, spacing, fontSize, fonts } from '../../lib/theme';

const QUICK_OZ = [8, 12, 16, 24];

export function HydrationCard({ targetOz }: { targetOz: number | null }) {
  const { totalOz, entries, addDrink, undoLast } = useHydration();
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const pct = targetOz ? Math.min(1, totalOz / targetOz) : 0;
  const remaining = targetOz ? Math.max(0, targetOz - totalOz) : null;

  const log = (oz: number) => {
    addDrink(oz);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <SectionCard eyebrow="Hydration" title="Today's water">
      <View style={styles.row}>
        <View style={styles.bottle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.fill, { height: `${Math.round(pct * 100)}%` }]} />
        </View>
        <View style={styles.stats}>
          <View style={styles.amountRow}>
            <DisplayText size={44}>{Math.round(totalOz)}</DisplayText>
            <Text style={styles.unit}>{targetOz ? `/ ${targetOz} fl oz` : 'fl oz'}</Text>
          </View>
          <Text style={styles.meta}>
            {Math.round(totalOz * OZ_TO_ML)} mL · {entries.length} {entries.length === 1 ? 'drink' : 'drinks'}
          </Text>
          <Text style={styles.meta}>
            {remaining == null ? 'No daily target set by your coach yet' : remaining === 0 ? 'Target hit' : `${Math.round(remaining)} oz to go`}
          </Text>
          {targetOz ? (
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.grid}>
        {QUICK_OZ.map((oz) => (
          <TouchableOpacity
            key={oz}
            style={styles.drink}
            onPress={() => log(oz)}
            accessibilityRole="button"
            accessibilityLabel={`Log ${oz} ounces`}
          >
            <Text style={styles.drinkOz}>
              {oz}
              <Text style={styles.drinkUnit}> oz</Text>
            </Text>
            <Text style={styles.drinkMl}>{Math.round(oz * OZ_TO_ML)} mL</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showCustom ? (
        <View style={styles.customRow}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder="Ounces"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Custom amount in ounces"
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              const oz = parseFloat(custom);
              if (oz > 0) log(oz);
              setCustom('');
              setShowCustom(false);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setShowCustom((v) => !v)} style={styles.linkBtn} accessibilityRole="button">
          <Text style={styles.link}>{showCustom ? 'Cancel' : '+ Custom amount'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={undoLast} disabled={entries.length === 0} style={styles.linkBtn} accessibilityRole="button">
          <Text style={[styles.muted, entries.length === 0 && { opacity: 0.5 }]}>Undo last</Text>
        </TouchableOpacity>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg + 2, alignItems: 'center' },
  bottle: {
    width: 72,
    height: 112,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.borderAccent,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { backgroundColor: '#C49A2C', width: '100%' },
  stats: { flex: 1, gap: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  unit: { fontSize: fontSize.sm, color: colors.textSecondary },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: colors.accent },
  grid: { flexDirection: 'row', gap: spacing.sm },
  drink: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  drinkOz: { fontFamily: fonts.display, fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  drinkUnit: { fontSize: 11, color: colors.textSecondary },
  drinkMl: { fontSize: 10, color: colors.textSecondary },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSunken,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
  addBtn: { height: 48, paddingHorizontal: spacing.xl, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center' },
  addBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: fontSize.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.accentText, fontWeight: '600', fontSize: fontSize.sm },
  muted: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
});
