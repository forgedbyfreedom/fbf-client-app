import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { getPeptideById } from '../../lib/peptide-data';

export default function PeptideDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client } = useAuth();
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  const peptide = getPeptideById(id);

  useEffect(() => {
    api.get<{ unlocked_peptide_ids: string[] }>('/api/client/peptide-unlocks')
      .then((res) => setUnlockedIds(res.unlocked_peptide_ids || []))
      .catch(() => {});
  }, []);

  if (!peptide) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={styles.errorText}>Peptide not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isUnlocked = unlockedIds.includes(peptide.id);

  const requestMoreInfo = async () => {
    setRequestingInfo(true);
    try {
      await api.post('/api/notifications/peptide-interest', {
        peptide_id: peptide.id,
        peptide_name: peptide.name,
        action: 'more_info',
      });
      Alert.alert(
        'Request Sent!',
        `Your coach has been notified that you'd like more information about ${peptide.name}. They'll reach out shortly.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Sent', 'Your interest has been noted. Your coach will follow up.');
    }
    setRequestingInfo(false);
  };

  const bookConsult = () => {
    router.push(`/peptides/book-consult?preselect=${peptide.id}`);
  };

  const exp = peptide.realisticExpectations;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
    >
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>{'<'} Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{peptide.categoryLabel}</Text>
        </View>
        {isUnlocked && (
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
          </View>
        )}
        <Text style={styles.title}>{peptide.name}</Text>
        <Text style={styles.meta}>{peptide.vialSize} · {peptide.frequency}</Text>
      </View>

      {/* What It Does */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What It Does</Text>
        <Text style={styles.headline}>{peptide.headline}</Text>
      </View>

      {/* Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benefits</Text>
        {peptide.benefits.map((benefit, i) => (
          <View key={i} style={styles.benefitRow}>
            <Text style={styles.bullet}>▸</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {/* Realistic Expectations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Realistic Expectations</Text>
        <Text style={styles.expectNote}>What you'll actually experience, week by week:</Text>

        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineLabel}>Weeks 1–2</Text>
            <Text style={styles.timelineText}>{exp.week1_2}</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineLabel}>Weeks 3–4</Text>
            <Text style={styles.timelineText}>{exp.week3_4}</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineLabel}>Weeks 5–8</Text>
            <Text style={styles.timelineText}>{exp.week5_8}</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineLabel}>Weeks 9+</Text>
            <Text style={styles.timelineText}>{exp.week9_plus}</Text>
          </View>
        </View>

        <View style={styles.wontFeelBox}>
          <Text style={styles.wontFeelTitle}>Setting Expectations</Text>
          <Text style={styles.wontFeelText}>{exp.wontFeel}</Text>
        </View>
      </View>

      {peptide.note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>⚕️ {peptide.note}</Text>
        </View>
      )}

      {/* Locked/Unlocked content */}
      {isUnlocked ? (
        <View style={styles.unlockedSection}>
          <View style={styles.unlockedHeader}>
            <Text style={styles.unlockedHeaderIcon}>🔓</Text>
            <Text style={styles.unlockedHeaderTitle}>Full Protocol — Unlocked</Text>
          </View>
          <Text style={styles.unlockedInfo}>
            Your full deep dive for {peptide.name} — including dosing strategies, reconstitution instructions, cycling schedules, stacking recommendations, and contraindications — was covered in your consult. Refer to your program document or reach out to your coach for a refresher.
          </Text>
          <TouchableOpacity style={styles.infoButton} onPress={requestMoreInfo} disabled={requestingInfo}>
            <Text style={styles.infoButtonText}>
              {requestingInfo ? 'Sending...' : 'Request a Refresher'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.teaserBox}>
          <Text style={styles.teaserIcon}>🔒</Text>
          <Text style={styles.teaserTitle}>Ready for the Full Protocol?</Text>
          <Text style={styles.teaserText}>
            Book a consult to unlock dosing strategies, reconstitution instructions, cycling schedules, stacking recommendations, contraindications, and research samples for {peptide.name}.
          </Text>
          <Text style={styles.teaserUnlock}>Once purchased, this peptide is permanently unlocked on your account.</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {!isUnlocked && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.infoBtn, requestingInfo && { opacity: 0.6 }]}
            onPress={requestMoreInfo}
            disabled={requestingInfo}
            activeOpacity={0.7}
          >
            <Text style={styles.infoBtnText}>
              {requestingInfo ? 'Sending...' : 'I Want More Info'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.consultBtn, isUnlocked && { flex: 0, paddingHorizontal: spacing.xxl }]}
          onPress={bookConsult}
          activeOpacity={0.7}
        >
          <Text style={styles.consultBtnText}>
            {isUnlocked ? 'Book Another Consult' : 'Book a Consult'}
          </Text>
        </TouchableOpacity>
      </View>
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
  errorText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,106,0,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unlockedBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  unlockedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bullet: {
    color: colors.accent,
    fontWeight: '700',
    marginRight: spacing.sm,
    marginTop: 2,
    fontSize: fontSize.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  expectNote: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginRight: spacing.md,
    marginTop: 4,
  },
  timelineLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  timelineText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  wontFeelBox: {
    backgroundColor: 'rgba(255,106,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  wontFeelTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  wontFeelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  noteText: {
    fontSize: fontSize.xs,
    color: '#ef4444',
    lineHeight: 18,
  },
  teaserBox: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  teaserIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  teaserTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  teaserText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  teaserUnlock: {
    fontSize: fontSize.xs,
    color: colors.green,
    fontWeight: '600',
    textAlign: 'center',
  },
  unlockedSection: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  unlockedHeaderIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  unlockedHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.green,
  },
  unlockedInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  infoButton: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.green,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtn: {
    backgroundColor: 'rgba(255,106,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  infoBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  consultBtn: {
    backgroundColor: colors.accent,
  },
  consultBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#0a0a0a',
  },
});
