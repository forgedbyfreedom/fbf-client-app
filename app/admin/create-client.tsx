import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CoachPicker } from '../../components/admin/CoachPicker';
import { OrgCoach } from '../../types';
import { colors, fontSize, spacing } from '../../lib/theme';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function CreateClientScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [coaches, setCoaches] = useState<OrgCoach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetSteps, setTargetSteps] = useState('');
  const [weighInDay, setWeighInDay] = useState('monday');
  const [coachId, setCoachId] = useState<string | null>(null);

  const fetchCoaches = useCallback(async () => {
    try {
      const res = await api.get<{ coaches: OrgCoach[] }>('/api/admin/coaches');
      setCoaches(res.coaches);
      if (res.coaches.length > 0) {
        setCoachId(res.coaches[0].user_id);
      }
    } catch (err) {
      console.error('Fetch coaches error:', err);
    } finally {
      setLoadingCoaches(false);
    }
  }, []);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First and last name are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/admin/clients', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        target_calories: targetCalories ? parseInt(targetCalories) : null,
        target_protein: targetProtein ? parseInt(targetProtein) : null,
        target_steps: targetSteps ? parseInt(targetSteps) : null,
        weigh_in_day: weighInDay,
        coach_user_id: coachId,
      });
      Alert.alert('Success', 'Client created', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>New Client</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="First Name *"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <Input
          label="Last Name *"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionTitle}>Targets</Text>
        <Input
          label="Daily Calories"
          value={targetCalories}
          onChangeText={setTargetCalories}
          keyboardType="numeric"
          placeholder="e.g. 2500"
        />
        <Input
          label="Daily Protein (g)"
          value={targetProtein}
          onChangeText={setTargetProtein}
          keyboardType="numeric"
          placeholder="e.g. 180"
        />
        <Input
          label="Daily Steps"
          value={targetSteps}
          onChangeText={setTargetSteps}
          keyboardType="numeric"
          placeholder="e.g. 10000"
        />

        <Text style={styles.sectionTitle}>Weigh-in Day</Text>
        <View style={styles.dayPicker}>
          {DAYS.map(day => (
            <TouchableOpacity
              key={day}
              style={[styles.dayButton, weighInDay === day && styles.dayButtonActive]}
              onPress={() => setWeighInDay(day)}
            >
              <Text style={[styles.dayText, weighInDay === day && styles.dayTextActive]}>
                {day.slice(0, 3).toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Assign Coach</Text>
        <CoachPicker
          coaches={coaches}
          selectedId={coachId}
          onSelect={setCoachId}
          loading={loadingCoaches}
        />

        <Button
          title="Create Client"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!firstName.trim() || !lastName.trim()}
          style={{ marginTop: spacing.lg }}
        />

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  dayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  dayText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayTextActive: {
    color: colors.accent,
  },
});
