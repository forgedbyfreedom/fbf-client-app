import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SectionCard } from '../ui/SectionCard';
import type { HubCheckin, PhotoSlot } from '../../lib/hub';
import { colors, fontSize, spacing } from '../../lib/theme';

/**
 * Side-by-side progress photos from two check-ins, same pose. Pick any two
 * dates; defaults to first vs latest. Weight change between them is shown.
 */
const POSES: PhotoSlot[] = ['front', 'side', 'back'];

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function PhotoCompare({ checkins, title = 'Side-by-side' }: { checkins: HubCheckin[]; title?: string }) {
  const withPhotos = useMemo(() => checkins.filter((c) => c.photos.length > 0), [checkins]);
  const [pose, setPose] = useState<PhotoSlot>('front');
  const [leftId, setLeftId] = useState<number | null>(null);
  const [rightId, setRightId] = useState<number | null>(null);

  useEffect(() => {
    if (withPhotos.length) {
      setRightId(withPhotos[0].id);
      setLeftId(withPhotos[withPhotos.length - 1].id);
    }
  }, [withPhotos]);

  if (withPhotos.length === 0) {
    return (
      <SectionCard eyebrow="Physique" title={title} subtitle="Your photos appear here after your first weekly check-in." />
    );
  }

  const left = withPhotos.find((c) => c.id === leftId) ?? withPhotos[withPhotos.length - 1];
  const right = withPhotos.find((c) => c.id === rightId) ?? withPhotos[0];
  const lw = left.fields.weight_lbs;
  const rw = right.fields.weight_lbs;
  const delta = lw != null && rw != null && left.id !== right.id ? rw - lw : null;

  return (
    <SectionCard
      eyebrow="Physique"
      title={title}
      subtitle={delta != null ? `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1)} lb between these check-ins` : undefined}
    >
      <View style={styles.photos}>
        {[left, right].map((c, i) => (
          <View key={i} style={styles.col}>
            {c.photo_urls[pose] ? (
              <Image source={{ uri: c.photo_urls[pose] }} style={styles.photo} resizeMode="cover" accessibilityLabel={`${pose} photo ${fmt(c.created_at)}`} />
            ) : (
              <View style={[styles.photo, styles.missing]}>
                <Text style={styles.missingText}>No {pose} photo</Text>
              </View>
            )}
            <Text style={[styles.date, i === 1 && { color: colors.accentText }]}>
              {fmt(c.created_at)}
              {c.fields.weight_lbs != null ? ` · ${c.fields.weight_lbs} lb` : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.tabs}>
        {POSES.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPose(p)}
            style={[styles.tab, pose === p && styles.tabOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: pose === p }}
          >
            <Text style={[styles.tabText, pose === p && styles.tabTextOn]}>{p[0].toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {withPhotos.length > 2 ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.pickLabel}>Compare from</Text>
          <DateChips list={withPhotos} selected={left.id} onPick={setLeftId} />
          <Text style={styles.pickLabel}>to</Text>
          <DateChips list={withPhotos} selected={right.id} onPick={setRightId} />
        </View>
      ) : null}
    </SectionCard>
  );
}

function DateChips({ list, selected, onPick }: { list: HubCheckin[]; selected: number; onPick: (id: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {list.map((c) => (
        <TouchableOpacity
          key={c.id}
          onPress={() => onPick(c.id)}
          style={[styles.chip, selected === c.id && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === c.id }}
        >
          <Text style={[styles.chipText, selected === c.id && styles.chipTextOn]}>{fmt(c.created_at)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1, gap: 6 },
  photo: { width: '100%', aspectRatio: 0.66, borderRadius: 14, backgroundColor: colors.surfaceSunken },
  missing: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  missingText: { color: colors.textSecondary, fontSize: 12 },
  date: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  tabOn: { borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  tabTextOn: { color: colors.accentText },
  pickLabel: { color: colors.textSecondary, fontSize: 12 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, justifyContent: 'center' },
  chipOn: { backgroundColor: '#2A2414', borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: colors.accentText },
});

