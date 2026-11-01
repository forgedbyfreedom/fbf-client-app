import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SectionCard } from '../ui/SectionCard';
import { colors, fontSize, fonts, spacing, borderRadius } from '../../lib/theme';

interface RunningTotalsBarProps {
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
  };
  title?: string;
}

interface MacroRowProps {
  label: string;
  eaten: number;
  target: number | null;
  unit: string;
}

/** One macro: what you've eaten, your target, and what's left (or how far over). */
function MacroRow({ label, eaten, target, unit }: MacroRowProps) {
  const e = Math.round(eaten);
  const t = target ? Math.round(target) : null;
  const left = t !== null ? t - e : null;
  const over = left !== null && left < 0;
  const pct = t ? Math.min((e / t) * 100, 100) : 0;
  const u = unit === 'kcal' ? '' : unit;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.eaten}>
          {e.toLocaleString()}
          {u}
          {t !== null ? <Text style={styles.target}>{` / ${t.toLocaleString()}${u}`}</Text> : null}
        </Text>
      </View>
      {t !== null ? (
        <>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: over ? colors.red : colors.accent }]} />
          </View>
          <Text style={[styles.left, over && styles.over]}>
            {over ? `${Math.abs(left!).toLocaleString()}${u} over` : `${left!.toLocaleString()}${u} left`}
          </Text>
        </>
      ) : (
        <Text style={styles.left}>No target set</Text>
      )}
    </View>
  );
}

export function RunningTotalsBar({ totals, targets, title = "Today's food" }: RunningTotalsBarProps) {
  const calLeft = targets.calories ? Math.round(targets.calories - totals.calories) : null;
  return (
    <SectionCard
      eyebrow={title}
      title={
        calLeft === null
          ? `${Math.round(totals.calories).toLocaleString()} calories eaten`
          : calLeft >= 0
            ? `${calLeft.toLocaleString()} calories left`
            : `${Math.abs(calLeft).toLocaleString()} calories over`
      }
      subtitle={
        targets.calories
          ? `Eaten ${Math.round(totals.calories).toLocaleString()} of ${Math.round(targets.calories).toLocaleString()}`
          : undefined
      }
      style={styles.card}
    >
      <View style={styles.grid}>
        <MacroRow label="Calories" eaten={totals.calories} target={targets.calories} unit="kcal" />
        <MacroRow label="Protein" eaten={totals.protein_g} target={targets.protein} unit="g" />
        <MacroRow label="Carbs" eaten={totals.carbs_g} target={targets.carbs} unit="g" />
        <MacroRow label="Fat" eaten={totals.fat_g} target={targets.fats} unit="g" />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  grid: { gap: spacing.md, marginTop: spacing.sm },
  row: { gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  eaten: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.textPrimary },
  target: { fontSize: fontSize.sm, color: colors.textTertiary },
  barBg: { height: 6, backgroundColor: colors.border, borderRadius: borderRadius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: borderRadius.full },
  left: { fontSize: fontSize.xs, color: colors.accentText, fontWeight: '600' },
  over: { color: colors.red },
});
