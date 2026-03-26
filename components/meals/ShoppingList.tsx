import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { colors, fontSize, spacing, borderRadius } from '../../lib/theme';
import { ShoppingListItem, GroceryCategory, CATEGORY_CONFIG } from '../../lib/nutrition-api';

interface ShoppingListProps {
  items: ShoppingListItem[];
  onToggleItem: (name: string) => void;
}

export function ShoppingList({ items, onToggleItem }: ShoppingListProps) {
  // Group items by category
  const grouped = items.reduce<Record<GroceryCategory, ShoppingListItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<GroceryCategory, ShoppingListItem[]>
  );

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="cart-outline" size={20} color={colors.accent} />
        <Text style={styles.title}>Shopping List</Text>
        <Text style={styles.counter}>
          {checkedCount}/{items.length}
        </Text>
      </View>

      {Object.entries(grouped).map(([category, catItems]) => {
        const config = CATEGORY_CONFIG[category as GroceryCategory];
        return (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryDot, { backgroundColor: config.color }]} />
              <Text style={styles.categoryLabel}>{config.label}</Text>
              <Text style={styles.categoryCount}>{catItems.length}</Text>
            </View>
            {catItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={styles.itemRow}
                onPress={() => onToggleItem(item.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.checked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={item.checked ? colors.green : colors.textTertiary}
                />
                <View style={styles.itemInfo}>
                  <Text
                    style={[
                      styles.itemName,
                      item.checked && styles.itemChecked,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.itemQty}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  counter: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCount: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  itemChecked: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  itemQty: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
