import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CoachPicker } from './CoachPicker';
import { api } from '../../lib/api';
import { OrgCoach } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface QuickAddClientModalProps {
  visible: boolean;
  onClose: () => void;
  coaches: OrgCoach[];
  onCreated: () => void;
}

export function QuickAddClientModal({
  visible,
  onClose,
  coaches,
  onCreated,
}: QuickAddClientModalProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [coachId, setCoachId] = useState<string | null>(
    coaches.length > 0 ? coaches[0].user_id : null
  );
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setCoachId(coaches.length > 0 ? coaches[0].user_id : null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First and last name are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/admin/clients', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        coach_user_id: coachId,
      });
      Alert.alert('Success', `${firstName.trim()} ${lastName.trim()} created`, [
        { text: 'OK' },
      ]);
      reset();
      onClose();
      onCreated();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFullForm = () => {
    handleClose();
    router.push('/admin/create-client');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Quick Add Client</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fields}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoFocus
            />
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          {coaches.length > 0 && (
            <View style={styles.coachSection}>
              <Text style={styles.sectionLabel}>Assign Coach</Text>
              <CoachPicker
                coaches={coaches}
                selectedId={coachId}
                onSelect={setCoachId}
              />
            </View>
          )}

          <Button
            title="Create"
            onPress={handleCreate}
            loading={submitting}
            disabled={!firstName.trim() || !lastName.trim()}
            style={styles.createBtn}
          />

          <TouchableOpacity onPress={handleFullForm} style={styles.fullFormLink}>
            <Text style={styles.fullFormText}>Need more details?</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fields: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  coachSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  createBtn: {
    marginBottom: spacing.md,
  },
  fullFormLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  fullFormText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '500',
  },
});
