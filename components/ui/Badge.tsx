import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '../../lib/theme';

interface BadgeProps {
  count: number;
}

export function Badge({ count }: BadgeProps) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: -4,
    right: -8,
  },
  text: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
