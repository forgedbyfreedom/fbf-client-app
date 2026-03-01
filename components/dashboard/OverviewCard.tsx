import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing } from '../../lib/theme';
import { Checkin, Client } from '../../types';

interface OverviewCardProps {
  client: Client;
  latestCheckin: Checkin | null;
}

export function OverviewCard({ client, latestCheckin }: OverviewCardProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const greeting = getGreeting();

  return (
    <Card>
      <Text style={styles.greeting}>
        {greeting}, {client.first_name}
      </Text>
      <Text style={styles.date}>{today}</Text>

      {latestCheckin ? (
        <View style={styles.lastCheckin}>
          <Text style={styles.label}>Last Check-in</Text>
          <View style={styles.row}>
            <StatItem
              label="Weight"
              value={latestCheckin.weight_lbs ? `${latestCheckin.weight_lbs} lbs` : '--'}
            />
            <StatItem
              label="Mood"
              value={latestCheckin.mood_rating ? `${latestCheckin.mood_rating}/10` : '--'}
            />
            <StatItem
              label="Sleep"
              value={latestCheckin.sleep_hours ? `${latestCheckin.sleep_hours}h` : '--'}
            />
            <StatItem
              label="Steps"
              value={latestCheckin.steps ? latestCheckin.steps.toLocaleString() : '--'}
            />
          </View>
        </View>
      ) : (
        <Text style={styles.noCheckin}>No check-ins yet. Start your first one!</Text>
      )}
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  lastCheckin: {
    marginTop: spacing.lg,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noCheckin: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
