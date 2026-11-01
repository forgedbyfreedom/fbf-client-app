import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fonts } from '../../lib/theme';

/**
 * The redesign's one card pattern: small gold eyebrow, display title,
 * optional one-line subtitle, then content. One idea per card.
 */
interface SectionCardProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
  highlight?: boolean;
}

export function SectionCard({ eyebrow, title, subtitle, right, children, style, highlight }: SectionCardProps) {
  const hasHeader = !!(eyebrow || title || subtitle || right);
  return (
    <View style={[styles.card, highlight && styles.highlight, style]}>
      {hasHeader && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: object }) {
  const text = React.Children.toArray(children).join('');
  return <Text style={[styles.eyebrow, style]}>{text.toUpperCase()}</Text>;
}

export function DisplayText({ children, size = 34, style }: { children: React.ReactNode; size?: number; style?: object }) {
  return <Text style={[styles.display, { fontSize: size, lineHeight: Math.round(size * 1.15) }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg + 2,
    gap: spacing.md + 2,
  },
  highlight: {
    borderColor: colors.borderAccent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  display: {
    fontFamily: fonts.display,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
