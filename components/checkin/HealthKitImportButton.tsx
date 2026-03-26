import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface Props {
  onImport: () => Promise<void>;
  label?: string;
  dataTypes?: string;
  available?: boolean;
  authorized?: boolean;
  onRequestPermission?: () => Promise<boolean | void>;
}

export function HealthKitImportButton({
  onImport,
  label = 'Auto-fill from Apple Health',
  dataTypes,
  available = true,
  authorized = false,
  onRequestPermission,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Only hide on Android — always show on iOS (including iPad)
  if (Platform.OS === 'android') return null;

  const handlePress = async () => {
    if (!available) {
      // iPad or HealthKit not available — no action
      return;
    }
    if (!authorized && onRequestPermission) {
      setLoading(true);
      try {
        await onRequestPermission();
      } finally {
        setLoading(false);
      }
      return;
    }
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

  // iPad or HealthKit not available — show informational message
  if (!available) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.unavailableCard}>
          <View style={styles.buttonContent}>
            <Ionicons name="heart" size={16} color="#FF2D55" />
            <View style={styles.unavailableText}>
              <Text style={styles.unavailableTitle}>Apple Health Integration</Text>
              <Text style={styles.unavailableDesc}>
                Apple Health is not available on this device. You can manually enter your data below.
              </Text>
            </View>
          </View>
        </View>
        {dataTypes && (
          <Text style={styles.disclosure}>
            Apple Health data types supported: {dataTypes}
          </Text>
        )}
      </View>
    );
  }

  // Available but not authorized — show "Connect" state
  if (!authorized) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handlePress}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FF2D55" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="heart" size={16} color="#FF2D55" />
              <Text style={styles.connectText}>Connect Apple Health</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.disclosure}>
          Tap to connect Apple Health and auto-fill your check-in.{dataTypes ? ` Reads: ${dataTypes}` : ''}
        </Text>
      </View>
    );
  }

  // Connected and authorized — show import button
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
          Apple Health · Reads: {dataTypes}
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
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FF2D55',
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
  },
  connectText: {
    fontSize: fontSize.sm,
    color: '#FF2D55',
    fontWeight: '600',
  },
  unavailableCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    backgroundColor: 'rgba(255, 45, 85, 0.05)',
  },
  unavailableText: {
    flex: 1,
  },
  unavailableTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#FF2D55',
  },
  unavailableDesc: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 2,
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
