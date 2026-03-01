import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing } from '../../lib/theme';
import { Checkin } from '../../types';

interface TrendChartProps {
  checkins: Checkin[];
  dataKey: keyof Checkin;
  title: string;
  unit?: string;
  color?: string;
}

export function TrendChart({
  checkins,
  dataKey,
  title,
  unit = '',
  color = colors.accent,
}: TrendChartProps) {
  const data = checkins
    .slice(0, 14)
    .reverse()
    .map((c) => ({
      date: c.date,
      value: (c[dataKey] as number) ?? null,
    }))
    .filter((d) => d.value !== null);

  if (data.length < 2) {
    return (
      <Card>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>Not enough data for chart</Text>
      </Card>
    );
  }

  const values = data.map((d) => d.value!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartWidth = Dimensions.get('window').width - 80;
  const chartHeight = 100;

  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
          {data.map((d, i) => {
            const barHeight = ((d.value! - min) / range) * (chartHeight - 20) + 20;
            const barWidth = Math.max((chartWidth / data.length) - 4, 4);
            return (
              <View
                key={d.date}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    width: barWidth,
                    backgroundColor: color,
                    marginHorizontal: 2,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.rangeRow}>
          <Text style={styles.rangeText}>
            {min}
            {unit}
          </Text>
          <Text style={styles.rangeText}>
            {max}
            {unit}
          </Text>
        </View>
      </View>
      <Text style={styles.latest}>
        Latest: {values[values.length - 1]}
        {unit}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  noData: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  chartContainer: {
    marginBottom: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    borderRadius: 2,
    opacity: 0.85,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rangeText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  latest: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
