import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SectionCard } from '../ui/SectionCard';
import type { Assessment } from '../../lib/hub';
import { TAPE_SITES, SKINFOLD_SITES } from '../../lib/assessment';
import { colors, fonts, fontSize, spacing } from '../../lib/theme';

/** One body assessment (7-site calipers + tape), compared with the previous one. */
export function AssessmentCard({ a, prev, eyebrow = 'Calipers & tape' }: { a: Assessment; prev?: Assessment | null; eyebrow?: string }) {
  const diff = (x?: number, y?: number) => {
    if (x == null || y == null) return null;
    const d = Math.round((x - y) * 10) / 10;
    return d === 0 ? '±0' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`;
  };
  const bfd = diff(a.bf_percent ?? undefined, prev?.bf_percent ?? undefined);
  return (
    <SectionCard
      eyebrow={eyebrow}
      title={`${a.bf_percent ?? '—'}% body fat`}
      subtitle={`Jackson-Pollock 7-site · ${a.created_at.slice(0, 10)}${bfd ? ` · ${bfd}% vs ${prev!.created_at.slice(0, 10)}` : ''}`}
    >
      <View style={styles.stats}>
        <Stat label="Sum of 7" value={`${a.sum_mm} mm`} />
        <Stat label="Lean" value={a.lean_mass_lb != null ? `${a.lean_mass_lb} lb` : '—'} />
        <Stat label="Fat" value={a.fat_mass_lb != null ? `${a.fat_mass_lb} lb` : '—'} />
      </View>
      <Table title="Skinfolds (mm)" defs={SKINFOLD_SITES} now={a.skinfolds} before={prev?.skinfolds} diff={diff} />
      <Table title="Tape (in)" defs={TAPE_SITES} now={a.tape} before={prev?.tape} diff={diff} />
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Table({ title, defs, now, before, diff }: { title: string; defs: { key: string; label: string }[]; now: Record<string, number>; before?: Record<string, number>; diff: (x?: number, y?: number) => string | null }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.tTitle}>{title}</Text>
      {defs.map((d) => {
        const ch = diff(now?.[d.key], before?.[d.key]);
        return (
          <View key={d.key} style={styles.row}>
            <Text style={styles.label}>{d.label}</Text>
            {ch ? <Text style={styles.change}>{ch}</Text> : null}
            <Text style={styles.value}>{now?.[d.key] ?? '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: spacing.md, gap: 2 },
  statLabel: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 18 },
  tTitle: { color: colors.accentText, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  row: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  label: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm + 1 },
  change: { color: colors.textTertiary, fontSize: 12 },
  value: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 16, minWidth: 54, textAlign: 'right' },
});
