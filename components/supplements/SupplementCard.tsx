import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

export interface SupplementCardItem {
  name: string;
  dose: string;
  timing?: string;
  frequency?: string;
  notes?: string;
  route?: string;
  compound?: string;
  test_result_url?: string;
}

interface SupplementCardProps {
  item: SupplementCardItem;
  type: 'supplement' | 'peptide' | 'ped' | 'medical';
  taken: boolean;
  onToggle: () => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  supplement: 'nutrition-outline',
  peptide: 'flask-outline',
  ped: 'fitness-outline',
  medical: 'medkit-outline',
};

const TYPE_LABELS: Record<string, string> = {
  supplement: 'Supplement',
  peptide: 'Peptide',
  ped: 'Compound',
  medical: 'Medical',
};

export function SupplementCard({ item, type, taken, onToggle }: SupplementCardProps) {
  const displayName = item.name || item.compound || 'Unknown';
  const displayTiming = item.timing || item.frequency || '';

  return (
    <View style={[styles.card, taken && styles.cardTaken]}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={TYPE_ICONS[type]}
            size={20}
            color={taken ? colors.green : colors.accent}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.dose}>{item.dose}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkbox, taken && styles.checkboxChecked]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          {taken && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>

      {displayTiming ? (
        <View style={styles.timingRow}>
          <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.timingText}>{displayTiming}</Text>
        </View>
      ) : null}

      {item.route ? (
        <View style={styles.timingRow}>
          <Ionicons name="navigate-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.timingText}>{item.route}</Text>
        </View>
      ) : null}

      {type === 'peptide' && (
        <View style={styles.timingRow}>
          <Ionicons name="refresh-outline" size={12} color={colors.accent} />
          <Text style={[styles.timingText, { color: colors.accent }]}>
            Rotate injection site
          </Text>
        </View>
      )}

      {item.notes ? (
        <Text style={styles.notes}>{item.notes}</Text>
      ) : null}

      {item.test_result_url ? (
        <TouchableOpacity
          style={styles.testResultBtn}
          onPress={() => Linking.openURL(item.test_result_url!)}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={14} color={colors.accent} />
          <Text style={styles.testResultText}>View Test Results</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.typeTag}>
        <Text style={styles.typeTagText}>{TYPE_LABELS[type]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTaken: {
    borderColor: colors.green,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dose: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingLeft: 52,
  },
  timingText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  notes: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingLeft: 52,
  },
  testResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingLeft: 52,
    paddingVertical: spacing.xs,
  },
  testResultText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.accent,
  },
  typeTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
