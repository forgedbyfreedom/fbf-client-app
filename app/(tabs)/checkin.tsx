import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function CheckinTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { client } = useAuth();
  const [hasDraft, setHasDraft] = useState(false);

  const draftKey = client
    ? `fbf-draft-${client.id}-${new Date().toISOString().split('T')[0]}`
    : null;

  useEffect(() => {
    if (!draftKey) return;
    AsyncStorage.getItem(draftKey).then((saved) => {
      setHasDraft(!!saved);
    });
  }, [draftKey]);

  const startCheckin = () => {
    router.push('/checkin/0');
  };

  const resumeCheckin = () => {
    router.push('/checkin/0');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.title}>Daily Check-in</Text>
      <Text style={styles.subtitle}>
        Track your progress with a quick 6-step check-in. Your coach will review
        everything.
      </Text>

      <View style={styles.actions}>
        {hasDraft ? (
          <>
            <Button
              title="Resume Draft"
              onPress={resumeCheckin}
              style={styles.mainBtn}
            />
            <Button
              title="Start Fresh"
              variant="secondary"
              onPress={async () => {
                if (draftKey) await AsyncStorage.removeItem(draftKey);
                setHasDraft(false);
                startCheckin();
              }}
            />
          </>
        ) : (
          <Button
            title="Start Check-in"
            onPress={startCheckin}
            style={styles.mainBtn}
          />
        )}
      </View>

      <View style={styles.stepsPreview}>
        {[
          'Body & Wellness',
          'Nutrition & Hydration',
          'Activity & Training',
          'Sleep',
          'Supplements & Compounds',
          'Notes & Photos',
        ].map((label, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  mainBtn: {
    paddingVertical: spacing.lg,
  },
  stepsPreview: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  stepLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
