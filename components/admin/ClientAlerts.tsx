import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Checkin } from '../../types';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface ClientAlertsProps {
  checkins: Checkin[];
  targetCalories?: number | null;
}

interface Alert {
  type: 'warning' | 'danger';
  message: string;
  icon: string;
}

function computeAlerts(checkins: Checkin[], targetCalories?: number | null): Alert[] {
  if (checkins.length === 0) return [];

  const alerts: Alert[] = [];
  const recent3 = checkins.slice(0, 3);
  const latest = checkins[0];

  // --- #8: Auto-flagging ---

  // Weight change > 3 lbs between most recent and previous
  if (checkins.length >= 2) {
    const curr = checkins[0].weight_lbs;
    const prev = checkins[1].weight_lbs;
    if (curr != null && prev != null) {
      const delta = Math.abs(curr - prev);
      if (delta > 3) {
        const sign = curr > prev ? '+' : '-';
        alerts.push({
          type: 'warning',
          message: `Weight shifted ${sign}${delta.toFixed(1)} lbs`,
          icon: 'scale-outline',
        });
      }
    }
  }

  // Low sleep in last 3
  for (const ci of recent3) {
    if (ci.sleep_hours != null && ci.sleep_hours < 5) {
      alerts.push({
        type: 'warning',
        message: `Low sleep detected (${ci.sleep_hours}h)`,
        icon: 'moon-outline',
      });
      break;
    }
  }

  // Calories significantly under target in last 3
  if (targetCalories != null) {
    for (const ci of recent3) {
      if (ci.calories != null && ci.calories < targetCalories - 500) {
        alerts.push({
          type: 'warning',
          message: 'Calories significantly under target',
          icon: 'restaurant-outline',
        });
        break;
      }
    }
  }

  // Low mood in last 3
  for (const ci of recent3) {
    if (ci.mood_rating != null && ci.mood_rating <= 3) {
      alerts.push({
        type: 'warning',
        message: 'Low mood reported',
        icon: 'sad-outline',
      });
      break;
    }
  }

  // Glucose out of range in last 3
  for (const ci of recent3) {
    if (ci.blood_glucose != null && (ci.blood_glucose > 180 || ci.blood_glucose < 70)) {
      alerts.push({
        type: 'danger',
        message: `Glucose out of range (${ci.blood_glucose} mg/dL)`,
        icon: 'water-outline',
      });
      break;
    }
  }

  // Elevated blood pressure in last 3
  for (const ci of recent3) {
    if (ci.blood_pressure_systolic != null && ci.blood_pressure_systolic > 140) {
      alerts.push({
        type: 'danger',
        message: 'Elevated blood pressure',
        icon: 'heart-outline',
      });
      break;
    }
  }

  // --- #9: Body temp refeed alert ---

  // Last 2 consecutive temps <= 97.4
  if (checkins.length >= 2) {
    const t0 = checkins[0].body_temp;
    const t1 = checkins[1].body_temp;
    if (t0 != null && t1 != null && t0 <= 97.4 && t1 <= 97.4) {
      alerts.push({
        type: 'warning',
        message: 'Body temp low 2+ days \u2014 consider refeed',
        icon: 'thermometer-outline',
      });
    }
  }

  // Any temp <= 97.0 in last 3
  for (const ci of recent3) {
    if (ci.body_temp != null && ci.body_temp <= 97.0) {
      alerts.push({
        type: 'danger',
        message: 'Body temp critically low \u2014 refeed recommended',
        icon: 'thermometer-outline',
      });
      break;
    }
  }

  // --- #10: Metabolic fatigue detection ---
  if (
    latest.body_temp != null &&
    latest.body_temp <= 97.4 &&
    latest.sleep_hours != null &&
    latest.sleep_hours < 6 &&
    latest.performance_rating != null &&
    latest.performance_rating <= 5
  ) {
    alerts.push({
      type: 'danger',
      message: 'Metabolic fatigue detected \u2014 consider deload + refeed',
      icon: 'warning-outline',
    });
  }

  return alerts;
}

export function ClientAlerts({ checkins, targetCalories }: ClientAlertsProps) {
  const alerts = computeAlerts(checkins, targetCalories);

  if (alerts.length === 0) return null;

  return (
    <Card>
      <Text style={styles.sectionLabel}>Flags</Text>
      <View style={styles.alertList}>
        {alerts.map((alert, index) => {
          const isDanger = alert.type === 'danger';
          return (
            <View
              key={index}
              style={[
                styles.alertRow,
                {
                  backgroundColor: isDanger
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(234, 179, 8, 0.1)',
                },
              ]}
            >
              <Ionicons
                name={alert.icon as any}
                size={18}
                color={isDanger ? colors.red : colors.yellow}
                style={styles.alertIcon}
              />
              <Text
                style={[
                  styles.alertText,
                  { color: isDanger ? colors.red : colors.yellow },
                ]}
              >
                {alert.message}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  alertList: {
    gap: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  alertIcon: {
    marginRight: spacing.sm,
  },
  alertText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
});
