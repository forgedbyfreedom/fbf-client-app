import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge } from '../../types';
import { Button } from '../ui/Button';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface JoinChallengeModalProps {
  visible: boolean;
  challenge: Challenge;
  onClose: () => void;
  onJoin: (baselineValue: number) => Promise<void>;
}

export function JoinChallengeModal({
  visible,
  challenge,
  onClose,
  onJoin,
}: JoinChallengeModalProps) {
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const val = parseFloat(baseline);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid baseline number.');
      return;
    }
    setLoading(true);
    try {
      await onJoin(val);
      setBaseline('');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to join challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = (): string => {
    switch (challenge.type) {
      case 'weight_loss_pct':
        return 'Current weight (lbs)';
      case 'body_fat_pct':
        return 'Current body fat %';
      case 'strength_gain_pct':
        return 'Current 1RM (lbs)';
      case 'steps':
        return '0 (starts from zero)';
      case 'adherence':
        return 'Current adherence %';
      case 'custom':
        return 'Baseline value';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Join Challenge</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.challengeName}>{challenge.name}</Text>
          <Text style={styles.metricLabel}>{challenge.metric_label}</Text>

          {challenge.entry_fee_cents != null && challenge.entry_fee_cents > 0 && (
            <View style={styles.feeNotice}>
              <Ionicons name="information-circle" size={18} color="#3b82f6" />
              <Text style={styles.feeNoticeText}>
                Entry fee: ${(challenge.entry_fee_cents / 100).toFixed(0)} — Contact your coach to pay the entry fee.
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Your Baseline</Text>
          <TextInput
            style={styles.input}
            placeholder={getPlaceholder()}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={baseline}
            onChangeText={setBaseline}
            returnKeyType="done"
          />
          <Text style={styles.inputHint}>
            This is your starting value. All progress is tracked as a percentage from this baseline.
          </Text>

          <View style={styles.verifyNote}>
            <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.verifyNoteText}>
              Tip: Take a photo or screenshot of your baseline measurement for verification.
            </Text>
          </View>

          <Button
            title={loading ? 'Joining...' : 'Confirm & Join'}
            onPress={handleJoin}
            loading={loading}
            disabled={!baseline.trim()}
            style={styles.joinBtn}
          />

          <Button
            title="Cancel"
            variant="ghost"
            onPress={onClose}
          />
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  challengeName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  feeNoticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#3b82f6',
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  verifyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  verifyNoteText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  joinBtn: {
    marginBottom: spacing.sm,
  },
});
