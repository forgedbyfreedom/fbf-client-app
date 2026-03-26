import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import {
  ShoppingListItem,
  buildInstacartLink,
  buildWalmartLink,
  buildAmazonFreshLink,
} from '../../lib/nutrition-api';

interface DeliveryButtonsProps {
  items: ShoppingListItem[];
}

const SERVICES = [
  {
    name: 'Instacart',
    icon: 'storefront-outline' as const,
    color: '#43B02A',
    getLink: buildInstacartLink,
  },
  {
    name: 'Walmart',
    icon: 'cart-outline' as const,
    color: '#0071DC',
    getLink: buildWalmartLink,
  },
  {
    name: 'Amazon Fresh',
    icon: 'cube-outline' as const,
    color: '#FF9900',
    getLink: buildAmazonFreshLink,
  },
];

export function DeliveryButtons({ items }: DeliveryButtonsProps) {
  const uncheckedItems = items.filter((i) => !i.checked);

  const handlePress = async (getLink: (items: ShoppingListItem[]) => string) => {
    const url = getLink(uncheckedItems);
    try {
      await Linking.openURL(url);
    } catch {
      // Fallback silently
    }
  };

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="bicycle-outline" size={20} color={colors.accent} />
        <Text style={styles.title}>Order Delivery</Text>
      </View>
      <Text style={styles.subtitle}>
        Get your groceries delivered — {uncheckedItems.length} items remaining
      </Text>

      <View style={styles.buttonGrid}>
        {SERVICES.map((service) => (
          <TouchableOpacity
            key={service.name}
            style={[styles.button, { borderColor: service.color }]}
            onPress={() => handlePress(service.getLink)}
            activeOpacity={0.7}
          >
            <Ionicons name={service.icon} size={22} color={service.color} />
            <Text style={[styles.buttonText, { color: service.color }]} numberOfLines={1}>
              {service.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceHover,
  },
  buttonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
