import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Checkin } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

interface PhotoComparisonProps {
  checkins: Checkin[];
}

const screenWidth = Dimensions.get('window').width;

export function PhotoComparison({ checkins }: PhotoComparisonProps) {
  const photoCheckins = checkins.filter(
    (ci) => ci.progress_photo_urls && ci.progress_photo_urls.length > 0
  );

  // Default: leftIndex = second most recent, rightIndex = most recent
  const [leftIndex, setLeftIndex] = useState(
    photoCheckins.length >= 2 ? 1 : 0
  );
  const [rightIndex, setRightIndex] = useState(0);

  if (photoCheckins.length < 2) {
    return null;
  }

  const cycleLeft = (direction: 'prev' | 'next') => {
    setLeftIndex((prev) => {
      if (direction === 'prev') {
        return prev < photoCheckins.length - 1 ? prev + 1 : 0;
      }
      return prev > 0 ? prev - 1 : photoCheckins.length - 1;
    });
  };

  const cycleRight = (direction: 'prev' | 'next') => {
    setRightIndex((prev) => {
      if (direction === 'prev') {
        return prev < photoCheckins.length - 1 ? prev + 1 : 0;
      }
      return prev > 0 ? prev - 1 : photoCheckins.length - 1;
    });
  };

  const leftCheckin = photoCheckins[leftIndex];
  const rightCheckin = photoCheckins[rightIndex];
  const leftPhoto = leftCheckin.progress_photo_urls![0];
  const rightPhoto = rightCheckin.progress_photo_urls![0];

  return (
    <Card>
      <Text style={styles.sectionLabel}>Photo Comparison</Text>
      <View style={styles.row}>
        {/* Left side */}
        <View style={styles.side}>
          <Text style={styles.dateLabel}>{leftCheckin.date}</Text>
          <Image source={{ uri: leftPhoto }} style={styles.photo} />
          <View style={styles.arrowRow}>
            <TouchableOpacity
              onPress={() => cycleLeft('prev')}
              style={styles.arrowButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => cycleLeft('next')}
              style={styles.arrowButton}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gap */}
        <View style={styles.gap} />

        {/* Right side */}
        <View style={styles.side}>
          <Text style={styles.dateLabel}>{rightCheckin.date}</Text>
          <Image source={{ uri: rightPhoto }} style={styles.photo} />
          <View style={styles.arrowRow}>
            <TouchableOpacity
              onPress={() => cycleRight('prev')}
              style={styles.arrowButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => cycleRight('next')}
              style={styles.arrowButton}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  side: {
    flex: 1,
    alignItems: 'center',
  },
  gap: {
    width: 8,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  arrowRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  arrowButton: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
