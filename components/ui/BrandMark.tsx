import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';

/**
 * The FBF shield with the Team Yarbro mark beside it, used wherever the FBF logo
 * appears. Both marks are at least the same height (Team Yarbro is a touch taller
 * because the silhouette is narrow).
 */
const SHIELD = require('../../assets/fbf-shield.png');
const YARBRO = require('../../assets/brand/team-yarbro.png');
const SHIELD_RATIO = 459 / 432;
const YARBRO_RATIO = 223 / 640;

export function YarbroMark({ height }: { height: number }) {
  return <Image source={YARBRO} style={{ height, width: height * YARBRO_RATIO }} resizeMode="contain" accessibilityLabel="Team Yarbro" />;
}

export function BrandMark({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  const yh = Math.round(height * 1.15);
  return (
    <View style={[styles.row, { gap: Math.max(6, Math.round(height * 0.14)) }, style]} accessibilityLabel="Forged by Freedom, Team Yarbro">
      <Image source={SHIELD} style={{ height, width: height * SHIELD_RATIO }} resizeMode="contain" accessibilityLabel="Forged by Freedom" />
      <View style={{ width: 1, height: Math.round(height * 0.8), backgroundColor: '#D4A93A', opacity: 0.6 }} />
      <YarbroMark height={yh} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
