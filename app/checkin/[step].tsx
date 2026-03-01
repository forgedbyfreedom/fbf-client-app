import React, { useContext, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CheckinContext, TOTAL_STEPS } from '../../providers/CheckinProvider';
import { CheckinProvider } from '../../providers/CheckinProvider';
import { useCheckinDraft } from '../../hooks/useCheckinDraft';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { ProgressBar } from '../../components/checkin/ProgressBar';
import { StepBodyWellness } from '../../components/checkin/StepBodyWellness';
import { StepNutrition } from '../../components/checkin/StepNutrition';
import { StepActivity } from '../../components/checkin/StepActivity';
import { StepSleep } from '../../components/checkin/StepSleep';
import { StepSupplements } from '../../components/checkin/StepSupplements';
import { StepNotes } from '../../components/checkin/StepNotes';
import { Button } from '../../components/ui/Button';
import { colors, spacing } from '../../lib/theme';

function CheckinFormContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { step, setStep, form, resetForm } = useContext(CheckinContext);
  const { clearDraft } = useCheckinDraft();
  const { client, refreshClientData } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const steps = [
    <StepBodyWellness key={0} />,
    <StepNutrition key={1} />,
    <StepActivity key={2} />,
    <StepSleep key={3} />,
    <StepSupplements key={4} />,
    <StepNotes key={5} />,
  ];

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = async () => {
    if (!client) return;
    setSubmitting(true);

    try {
      // Build payload - parse numeric fields, strip empties
      const payload: Record<string, unknown> = {
        client_id: client.id,
        date: new Date().toISOString().split('T')[0],
      };

      const numericFields = [
        'weight_lbs', 'body_temp', 'calories', 'protein_g', 'carbs_g', 'fat_g',
        'steps', 'rpe', 'performance_rating', 'cardio_minutes', 'estimated_calories_burned',
      ];

      for (const key of numericFields) {
        const val = form[key as keyof typeof form] as string;
        if (val && val.trim()) {
          payload[key] = parseFloat(val);
        }
      }

      payload.mood_rating = form.mood_rating;
      payload.mood_notes = form.mood_notes || null;
      payload.stress_level = form.stress_level;
      payload.water_oz = form.water_oz || null;
      payload.training_done = form.training_done;
      payload.training_type = form.training_type.length > 0
        ? form.training_type.join(', ')
        : null;
      payload.workout_notes = form.workout_notes || null;
      payload.workout_description = form.workout_description || null;
      payload.sleep_hours = form.sleep_hours;
      payload.sleep_quality = form.sleep_quality;
      payload.supplement_compliance = form.supplement_compliance;
      payload.ped_log_json = form.ped_log_json.length > 0 ? form.ped_log_json : null;
      payload.side_effects_notes = form.side_effects_notes || null;
      payload.general_notes = form.general_notes || null;
      payload.progress_photo_urls = form.progress_photo_urls.length > 0
        ? form.progress_photo_urls
        : null;

      // BJJ calorie estimation
      if (form.bjj_done && form.bjj_rounds) {
        const rounds = parseInt(form.bjj_rounds) || 0;
        const roundMin = parseInt(form.bjj_round_min) || 5;
        const restMin = parseInt(form.bjj_rest_min) || 1;
        const drillMin = parseInt(form.bjj_drill_min) || 0;
        const totalMin = (rounds * roundMin) + ((rounds - 1) * restMin) + drillMin;
        const met = form.bjj_intensity === 'light' ? 5 : form.bjj_intensity === 'hard' ? 10 : 8;
        const weightKg = (parseFloat(form.weight_lbs) || 180) / 2.205;
        const bjjCals = Math.round(met * weightKg * (totalMin / 60));

        payload.estimated_calories_burned =
          ((payload.estimated_calories_burned as number) || 0) + bjjCals;

        // Append BJJ info to workout notes
        const bjjNote = `BJJ (${form.bjj_type}): ${rounds} rounds x ${roundMin}min, ${form.bjj_intensity} intensity, ~${bjjCals} kcal`;
        payload.workout_notes = payload.workout_notes
          ? `${payload.workout_notes}\n${bjjNote}`
          : bjjNote;
      }

      await api.post('/api/checkin', payload);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await clearDraft();
      resetForm();
      await refreshClientData();

      Alert.alert('Check-in Submitted!', 'Great work today. Your coach will review your data.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <ProgressBar step={step} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {steps[step]}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button
          title={step === 0 ? 'Cancel' : 'Back'}
          variant="ghost"
          onPress={goBack}
          style={styles.footerBtn}
        />
        {isLastStep ? (
          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={submitting}
            style={{ ...styles.footerBtn, ...styles.submitBtn }}
          />
        ) : (
          <Button
            title="Next"
            onPress={goNext}
            style={styles.footerBtn}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

export default function CheckinStepScreen() {
  return (
    <CheckinProvider>
      <CheckinFormContent />
    </CheckinProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerBtn: {
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.green,
  },
});
