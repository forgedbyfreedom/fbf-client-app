import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { GymPlace } from '../../lib/places-api';

interface GymCardProps {
  gym: GymPlace;
}

export function GymCard({ gym }: GymCardProps) {
  const openDirections = () => {
    const destination = `${gym.lat},${gym.lng}`;
    const label = encodeURIComponent(gym.name);

    if (Platform.OS === 'ios') {
      Linking.openURL(`maps:0,0?q=${label}@${destination}`);
    } else {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${gym.place_id}`
      );
    }
  };

  const renderStars = () => {
    const full = Math.floor(gym.rating);
    const half = gym.rating - full >= 0.5;
    const stars: React.ReactNode[] = [];

    for (let i = 0; i < full; i++) {
      stars.push(
        <Ionicons key={`full-${i}`} name="star" size={14} color={colors.accent} />
      );
    }
    if (half) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color={colors.accent} />
      );
    }
    const empty = 5 - full - (half ? 1 : 0);
    for (let i = 0; i < empty; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color={colors.textTertiary} />
      );
    }
    return stars;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {gym.name}
          </Text>
          {gym.open_now !== null && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: gym.open_now ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: gym.open_now ? colors.green : colors.red },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: gym.open_now ? colors.green : colors.red },
                ]}
              >
                {gym.open_now ? 'Open' : 'Closed'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.ratingRow}>
          <View style={styles.stars}>{renderStars()}</View>
          <Text style={styles.ratingText}>
            {gym.rating > 0 ? gym.rating.toFixed(1) : 'N/A'}
          </Text>
          {gym.user_ratings_total > 0 && (
            <Text style={styles.ratingCount}>({gym.user_ratings_total})</Text>
          )}
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.address} numberOfLines={2}>
            {gym.vicinity}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.distance}>{gym.distance.toFixed(1)} mi</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.directionsBtn} onPress={openDirections} activeOpacity={0.7}>
        <Ionicons name="navigate" size={16} color={colors.accent} />
        <Text style={styles.directionsBtnText}>Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  details: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  address: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  distance: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.md,
  },
  directionsBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
});
