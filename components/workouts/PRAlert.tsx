import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalRecord } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { calculateEpley1RM } from '../../lib/workout-utils';

interface PRAlertProps {
  prs: PersonalRecord[];
  onDismiss: () => void;
}

export function PRAlert({ prs, onDismiss }: PRAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prs.length > 0) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [prs]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (prs.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleDismiss} />
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconRow}>
          <Ionicons name="trophy" size={40} color={colors.accent} />
        </View>
        <Text style={styles.title}>NEW PERSONAL RECORD!</Text>
        {prs.map((pr, i) => (
          <View key={i} style={styles.prRow}>
            <Text style={styles.exerciseName}>{pr.exercise_name}</Text>
            <Text style={styles.prValue}>
              {pr.weight_lbs} lbs x {pr.reps} reps
            </Text>
            <Text style={styles.estimated1rm}>
              Est. 1RM: {pr.estimated_1rm} lbs
            </Text>
            {pr.previous_best ? (
              <Text style={styles.improvement}>
                +{pr.estimated_1rm - pr.previous_best} lbs over previous best
              </Text>
            ) : (
              <Text style={styles.improvement}>First PR recorded!</Text>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissText}>LET'S GO!</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.xxl,
    marginHorizontal: spacing.xxl,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconRow: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  prRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    width: '100%',
  },
  exerciseName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  prValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  estimated1rm: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  improvement: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.green,
  },
  dismissButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.md,
  },
  dismissText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
