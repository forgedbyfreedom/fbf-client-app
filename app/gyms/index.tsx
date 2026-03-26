import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../hooks/useLocation';
import { searchNearbyGyms, hasApiKey, GymPlace } from '../../lib/places-api';
import { GymCard } from '../../components/gyms/GymCard';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';

type FilterKey = '24hour' | 'freeweights' | 'crossfit' | 'commercial' | 'opennow';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'opennow', label: 'Open Now' },
  { key: '24hour', label: '24 Hour' },
  { key: 'freeweights', label: 'Free Weights' },
  { key: 'crossfit', label: 'CrossFit' },
  { key: 'commercial', label: 'Commercial' },
];

export default function GymsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { latitude, longitude, loading: locationLoading, error: locationError, requestPermission } = useLocation();

  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [filteredGyms, setFilteredGyms] = useState<GymPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

  const fetchGyms = useCallback(async () => {
    if (!latitude || !longitude) return;
    if (!hasApiKey()) {
      setError('Google Places API key needed. Add EXPO_PUBLIC_GOOGLE_PLACES_KEY to your .env');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await searchNearbyGyms(latitude, longitude);
      results.sort((a, b) => a.distance - b.distance);
      setGyms(results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load gyms');
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  useEffect(() => {
    if (activeFilters.size === 0) {
      setFilteredGyms(gyms);
      return;
    }

    const filtered = gyms.filter((gym) => {
      const nameLower = gym.name.toLowerCase();
      const typesStr = gym.types.join(' ').toLowerCase();

      if (activeFilters.has('opennow') && gym.open_now !== true) return false;
      if (activeFilters.has('24hour') && !nameLower.includes('24') && !nameLower.includes('anytime')) return false;
      if (activeFilters.has('crossfit') && !nameLower.includes('crossfit') && !typesStr.includes('crossfit')) return false;
      if (activeFilters.has('freeweights') && !nameLower.includes('free weight') && !nameLower.includes('iron') && !nameLower.includes('barbell')) return false;
      if (activeFilters.has('commercial') && !nameLower.includes('planet') && !nameLower.includes('la fitness') && !nameLower.includes('gold') && !nameLower.includes('ymca') && !nameLower.includes('lifetime') && !nameLower.includes('equinox') && !nameLower.includes('crunch')) return false;

      return true;
    });

    setFilteredGyms(filtered);
  }, [gyms, activeFilters]);

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isLoading = locationLoading || loading;
  const displayError = locationError || error;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <BrandHeader title="Gyms Near Me" compact />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>
            {locationLoading ? 'Getting your location...' : 'Finding nearby gyms...'}
          </Text>
        </View>
      ) : displayError ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.errorText}>{displayError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={locationError ? requestPermission : fetchGyms}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredGyms}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Filter Bar */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                {FILTERS.map((item) => {
                  const active = activeFilters.has(item.key);
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => toggleFilter(item.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.resultsCount}>
                {filteredGyms.length} gym{filteredGyms.length !== 1 ? 's' : ''} nearby
              </Text>
            </View>
          }
          renderItem={({ item }) => <GymCard gym={item} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="barbell-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No gyms found matching your filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accentMuted,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
