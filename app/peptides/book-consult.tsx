import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { PEPTIDES } from '../../lib/peptide-data';

type ConsultTier = 'standard' | 'deep_dive';

const TIERS = {
  standard: { label: '30-Min Standard', duration: '30 minutes', maxPeptides: 2, description: 'Perfect for focused questions on 1–2 specific peptides.' },
  deep_dive: { label: '60-Min Deep Dive', duration: '60 minutes', maxPeptides: 5, description: 'Comprehensive session covering up to 5 peptides with full protocol design.' },
} as const;

export default function BookConsultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preselect } = useLocalSearchParams<{ preselect?: string }>();
  const { client } = useAuth();

  const [tier, setTier] = useState<ConsultTier | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(preselect ? [preselect] : []);
  const [submitting, setSubmitting] = useState(false);

  const maxPeptides = tier ? TIERS[tier].maxPeptides : 0;

  const togglePeptide = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < maxPeptides) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleContinue = async () => {
    if (!tier || selectedIds.length === 0) return;
    setSubmitting(true);

    const selectedNames = selectedIds
      .map((id) => PEPTIDES.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    // Notify Bryan & Wendy
    try {
      await api.post('/api/notifications/peptide-interest', {
        peptide_id: selectedIds.join(','),
        peptide_name: selectedNames,
        action: 'book_consult',
        consult_tier: tier,
      });
    } catch {
      // Best-effort notification
    }

    // Open web booking page
    const clientName = client ? `${client.first_name} ${client.last_name}` : '';
    const url = `https://fbf-dashboard.vercel.app/book-consult?tier=${tier}&peptides=${encodeURIComponent(selectedNames)}&name=${encodeURIComponent(clientName)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Booking Requested', 'Your coach has been notified and will reach out to schedule your consult.');
    }

    setSubmitting(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
    >
      {/* Back */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>{'<'} Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📞</Text>
        <Text style={styles.title}>Book a Peptide Consult</Text>
        <Text style={styles.subtitle}>
          1-on-1 with your coach covering dosing, reconstitution, cycling, stacking, contraindications, and research samples.
        </Text>
      </View>

      {/* Step 1: Choose tier */}
      <Text style={styles.stepLabel}>Step 1 — Choose Your Consult</Text>
      <View style={styles.tierRow}>
        {(Object.entries(TIERS) as [ConsultTier, typeof TIERS[ConsultTier]][]).map(([key, t]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tierCard, tier === key && styles.tierCardActive]}
            onPress={() => {
              setTier(key);
              // If switching to a lower tier, trim selection
              if (key === 'standard' && selectedIds.length > 2) {
                setSelectedIds(selectedIds.slice(0, 2));
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tierLabel, tier === key && styles.tierLabelActive]}>{t.label}</Text>
            <Text style={[styles.tierDuration, tier === key && styles.tierDurationActive]}>
              {t.duration}
            </Text>
            <Text style={[styles.tierDesc, tier === key && styles.tierDescActive]}>
              Up to {t.maxPeptides} peptide{t.maxPeptides > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.tierDetail, tier === key && styles.tierDetailActive]}>{t.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Step 2: Select peptides */}
      {tier && (
        <>
          <Text style={styles.stepLabel}>Step 2 — Select Peptides ({selectedIds.length}/{maxPeptides})</Text>
          <View style={styles.chipGrid}>
            {PEPTIDES.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              const isDisabled = !isSelected && selectedIds.length >= maxPeptides;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isDisabled && styles.chipDisabled,
                  ]}
                  onPress={() => togglePeptide(p.id)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                      isDisabled && styles.chipTextDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reminder */}
          <View style={styles.reminderBox}>
            <Text style={styles.reminderText}>
              Includes reconstitution training, dosing protocols, cycling, stacking, contraindications, and research samples. Selected peptides permanently unlocked on your account.
            </Text>
          </View>

          {/* Continue */}
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (selectedIds.length === 0 || submitting) && styles.continueBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedIds.length === 0 || submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>
              {submitting
                ? 'Opening Booking...'
                : `Continue to Book — ${TIERS[tier].label}`}
            </Text>
          </TouchableOpacity>
        </>
      )}
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
  backBtn: {
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  tierCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,106,0,0.06)',
  },
  tierLabel: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  tierLabelActive: {
    color: colors.accent,
  },
  tierDuration: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  tierDurationActive: {
    color: colors.textSecondary,
  },
  tierDesc: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tierDescActive: {
    color: colors.textPrimary,
  },
  tierDetail: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  tierDetailActive: {
    color: colors.textSecondary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#0a0a0a',
  },
  chipTextDisabled: {
    color: colors.textTertiary,
  },
  reminderBox: {
    backgroundColor: 'rgba(255,106,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  reminderText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#0a0a0a',
  },
});
