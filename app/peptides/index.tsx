import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { PEPTIDES, CATEGORY_FILTERS, type PeptideCategory } from '../../lib/peptide-data';

export default function PeptideCatalogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client } = useAuth();
  const [activeFilter, setActiveFilter] = useState<PeptideCategory | 'all'>('all');
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    api.get<{ unlocked_peptide_ids: string[] }>('/api/client/peptide-unlocks')
      .then((res) => setUnlockedIds(res.unlocked_peptide_ids || []))
      .catch(() => {});
  }, []);

  const filtered = activeFilter === 'all'
    ? PEPTIDES
    : PEPTIDES.filter((p) => p.category === activeFilter);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerIcon}>🧬</Text>
        <Text style={styles.title}>Peptide Research</Text>
        <Text style={styles.subtitle}>
          Explore our full peptide catalog. Tap any compound to learn what it does, what to expect, and how to get started.
        </Text>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {CATEGORY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Peptide cards */}
      {filtered.map((peptide) => {
        const isUnlocked = unlockedIds.includes(peptide.id);
        return (
          <TouchableOpacity
            key={peptide.id}
            style={styles.card}
            onPress={() => router.push(`/peptides/${peptide.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{peptide.name}</Text>
                <Text style={styles.cardVial}>{peptide.vialSize} · {peptide.frequency}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{peptide.categoryLabel}</Text>
              </View>
            </View>
            <Text style={styles.cardHeadline} numberOfLines={2}>{peptide.headline}</Text>
            {isUnlocked && (
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedText}>UNLOCKED</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Bottom CTA */}
      <TouchableOpacity
        style={styles.ctaCard}
        onPress={() => router.push('/peptides/book-consult')}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaIcon}>📞</Text>
        <Text style={styles.ctaTitle}>Book a Peptide Consult</Text>
        <Text style={styles.ctaSub}>
          30 or 60-minute 1-on-1 with your coach. Covers dosing, reconstitution, cycling, stacking, contraindications, and research samples. Selected peptides permanently unlocked on your account.
        </Text>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Choose Your Consult</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  filterRow: {
    marginBottom: spacing.lg,
    maxHeight: 44,
  },
  filterContent: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#0a0a0a',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardVial: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,106,0,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeadline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  unlockedBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  unlockedText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 1,
  },
  ctaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ctaIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  ctaTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  ctaButtonText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#0a0a0a',
  },
});
