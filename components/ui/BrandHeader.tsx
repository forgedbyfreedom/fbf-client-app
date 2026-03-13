import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../../lib/theme';

interface BrandHeaderProps {
  title?: string;
  compact?: boolean;
}

export function BrandHeader({ title, compact }: BrandHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Image
        source={require('../../assets/fbf-logo.png')}
        style={compact ? styles.logoCompact : styles.logo}
        resizeMode="contain"
      />
      {title ? (
        <Text style={compact ? styles.titleCompact : styles.title}>{title}</Text>
      ) : (
        <View style={styles.brandText}>
          <Text style={styles.brandName}>FORGED BY FREEDOM</Text>
          <Text style={styles.brandSub}>Strength & Nutrition</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  containerCompact: {
    marginBottom: spacing.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  logoCompact: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {},
  brandName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: -1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  titleCompact: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
