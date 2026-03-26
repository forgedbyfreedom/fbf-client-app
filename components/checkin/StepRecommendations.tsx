import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { CheckinContext } from '../../providers/CheckinProvider';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { PEPTIDES } from '../../lib/peptide-data';

interface Recommendation {
  id: string;
  name: string;
  category: 'peptide';
  frequency: string;
  headline: string;
  benefits: string[];
  note?: string;
}

// Map shared peptide data to the recommendation format used by this component
const RECOMMENDATIONS: Recommendation[] = PEPTIDES.map((p) => ({
  id: p.id,
  name: `${p.name} (${p.vialSize})`,
  category: 'peptide' as const,
  frequency: `${p.frequency} · ${p.vialSize}`,
  headline: p.headline,
  benefits: p.benefits,
  note: p.note,
}));

export function StepRecommendations() {
  const { form, updateForm } = useContext(CheckinContext);
  const { client } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const optIns = form.recommendation_opt_ins || {};

  const toggleOptIn = (id: string) => {
    updateForm({
      recommendation_opt_ins: {
        ...optIns,
        [id]: !optIns[id],
      },
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const requestMoreInfo = async (rec: Recommendation) => {
    setRequestingId(rec.id);
    try {
      await api.post('/api/notifications/peptide-interest', {
        peptide_id: rec.id,
        peptide_name: rec.name,
        action: 'more_info',
      });
      Alert.alert(
        'Request Sent!',
        `Your coach has been notified that you'd like more information about ${rec.name}. They'll reach out shortly.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Sent', 'Your interest has been noted. Your coach will follow up.');
    }
    setRequestingId(null);
  };

  const bookConsult = (rec: Recommendation) => {
    const clientName = client ? `${client.first_name} ${client.last_name}` : '';
    const url = `https://fbf-dashboard.vercel.app/book-consult?peptide=${encodeURIComponent(rec.name)}&name=${encodeURIComponent(clientName)}`;
    Linking.openURL(url);
  };

  return (
    <View>
      <View style={styles.headerCard}>
        <Text style={styles.headerIcon}>🧬</Text>
        <Text style={styles.headerTitle}>Coaching Recommendations</Text>
        <Text style={styles.headerSubtitle}>
          Based on your goals, medical profile, and current protocol, your coach recommends
          the following compounds. Review each one and opt in to any you'd like to add to your program.
        </Text>
      </View>

      {RECOMMENDATIONS.map((rec) => {
        const isExpanded = expandedId === rec.id;
        const isOptedIn = !!optIns[rec.id];

        return (
          <View key={rec.id} style={[styles.recCard, isOptedIn && styles.recCardActive]}>
            {/* Header row */}
            <TouchableOpacity
              style={styles.recHeader}
              onPress={() => toggleExpanded(rec.id)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recName}>{rec.name}</Text>
                <Text style={styles.recFrequency}>{rec.frequency}</Text>
              </View>
              <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
            </TouchableOpacity>

            {/* Headline always visible */}
            <Text style={styles.recHeadline}>{rec.headline}</Text>

            {/* Expandable benefits */}
            {isExpanded && (
              <View style={styles.benefitsContainer}>
                {rec.benefits.map((benefit, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <Text style={styles.benefitBullet}>▸</Text>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
                {rec.note && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>⚕️ {rec.note}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.infoBtn, requestingId === rec.id && { opacity: 0.6 }]}
                onPress={() => requestMoreInfo(rec)}
                disabled={requestingId === rec.id}
                activeOpacity={0.7}
              >
                <Text style={styles.infoBtnText}>
                  {requestingId === rec.id ? 'Sending...' : 'More Information'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.consultBtn]}
                onPress={() => bookConsult(rec)}
                activeOpacity={0.7}
              >
                <Text style={styles.consultBtnText}>Book Consult</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>
          Opting in is an expression of interest only — it does not constitute a purchase or prescription.
          Your coach will review your selections, coordinate with your healthcare provider as needed,
          and reach out with next steps. All compounds require appropriate medical oversight.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: 'rgba(255,106,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  recCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  recCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,106,0,0.04)',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recFrequency: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    fontSize: fontSize.lg,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  recHeadline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  benefitsContainer: {
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  benefitBullet: {
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
  noteBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noteText: {
    fontSize: fontSize.xs,
    color: '#ef4444',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
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
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  consultBtn: {
    backgroundColor: colors.accent,
  },
  consultBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#0a0a0a',
  },
  disclaimerBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 16,
    textAlign: 'center',
  },
});
