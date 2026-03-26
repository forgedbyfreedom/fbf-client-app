import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, StyleSheet, Platform, Linking, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealthKit } from '../../hooks/useHealthKit';
import { colors, fontSize, spacing } from '../../lib/theme';

export function AppleHealthConnect() {
  const { available, authorized, requestPermission } = useHealthKit();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(authorized);
  }, [authorized]);

  // Re-check authorization when app returns from Settings
  const handleAppStateChange = useCallback(async (nextAppState: string) => {
    if (nextAppState === 'active') {
      const granted = await requestPermission();
      setEnabled(granted);
    }
  }, [requestPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [handleAppStateChange]);

  if (Platform.OS !== 'ios') return null;

  const handleToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPermission();
      setEnabled(granted);
      if (!granted) {
        Linking.openURL('app-settings:');
      }
    } else {
      setEnabled(false);
      Linking.openURL('app-settings:');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="heart" size={20} color="#FF2D55" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Apple Health</Text>
          <Text style={styles.subtitle}>
            {enabled ? 'Connected — auto-fills your daily check-ins' : 'Connect to auto-fill check-in data'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: '#FF2D55' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.dataList}>
        <Text style={styles.dataHeader}>Health data we read (never written):</Text>
        {[
          { icon: 'footsteps', label: 'Steps', desc: 'Daily step count' },
          { icon: 'bed', label: 'Sleep', desc: 'Duration & stages' },
          { icon: 'heart-circle', label: 'Heart Rate', desc: 'Resting & average' },
          { icon: 'thermometer', label: 'Body Temperature', desc: 'Daily readings' },
          { icon: 'flame', label: 'Active Energy', desc: 'Calories burned' },
          { icon: 'barbell', label: 'Workouts', desc: 'Type, duration & calories' },
          { icon: 'scale', label: 'Weight', desc: 'Body weight readings' },
        ].map((item) => (
          <View key={item.label} style={styles.dataRow}>
            <Ionicons
              name={item.icon as any}
              size={16}
              color={enabled ? '#FF2D55' : colors.textTertiary}
            />
            <Text style={styles.dataLabel}>{item.label}</Text>
            <Text style={styles.dataDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.privacy}>
        Your Apple Health data is used only to auto-fill check-ins. It is never sold, shared with third parties, or used for advertising. You can revoke access anytime in Settings → Health → Data Access.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: 1,
  },
  dataList: {
    marginTop: spacing.md,
    paddingLeft: 48,
  },
  dataHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  dataLabel: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '500',
    width: 100,
  },
  dataDesc: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  privacy: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    paddingLeft: 48,
    lineHeight: 14,
  },
});
