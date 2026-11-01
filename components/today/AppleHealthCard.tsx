import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealthKit } from '../../hooks/useHealthKit';
import { SectionCard } from '../ui/SectionCard';
import { colors, spacing, fontSize } from '../../lib/theme';

// Kept visible on iOS for App Store guideline 2.5.1 (HealthKit must be
// clearly identified in the UI). Moved here unchanged in behaviour.
const TYPES = ['Steps', 'Sleep', 'Heart Rate', 'Body Temp', 'Calories', 'Workouts', 'Weight'];

export function AppleHealthCard() {
  const { available, authorized, requestPermission } = useHealthKit();
  if (Platform.OS !== 'ios') return null;

  return (
    <SectionCard
      eyebrow="Apple Health"
      title={authorized ? 'Connected' : 'Connect Apple Health'}
      subtitle={
        !available
          ? 'Apple Health is not available on this device.'
          : authorized
          ? 'Health data auto-fills your check-ins and cardio.'
          : 'Auto-fill steps, sleep, workouts and weight.'
      }
      right={
        <View style={styles.icon}>
          <Ionicons name="heart" size={20} color="#FF2D55" />
        </View>
      }
    >
      <View style={styles.chips}>
        {TYPES.map((t) => (
          <View key={t} style={styles.chip}>
            <Text style={[styles.chipText, authorized && styles.chipTextOn]}>{t}</Text>
          </View>
        ))}
      </View>
      {available && !authorized ? (
        <TouchableOpacity style={styles.btn} onPress={() => requestPermission()} accessibilityRole="button">
          <Text style={styles.btnText}>Connect Apple Health</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.privacy}>Your health data is never sold, shared, or used for advertising.</Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.surfaceSunken, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  chipTextOn: { color: '#FF6B88' },
  btn: { backgroundColor: '#FF2D55', borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  privacy: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});
