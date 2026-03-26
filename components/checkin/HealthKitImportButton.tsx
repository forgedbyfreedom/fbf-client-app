import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface Props {
  onImport: () => Promise<void>;
  label?: string;
  dataTypes?: string;
}

export function HealthKitImportButton({
  onImport,
  label = 'Auto-fill from Apple Health',
  dataTypes,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (Platform.OS !== 'ios') return null;

  const handlePress = async () => {
    setLoading(true);
    try {
      await onImport();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.warn('[HealthKit] Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.button, done && styles.buttonDone]}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons
              name="heart"
              size={16}
              color={done ? '#22c55e' : '#FF2D55'}
            />
            <Text style={[styles.text, done && styles.textDone]}>
              {done ? 'Imported from Apple Health!' : label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {dataTypes && (
        <Text style={styles.disclosure}>
          <Ionicons name="heart" size={10} color="#FF2D55" /> Apple Health · Reads: {dataTypes}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDone: {
    borderColor: colors.green,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  textDone: {
    color: colors.green,
  },
  disclosure: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 6,
  },
});
