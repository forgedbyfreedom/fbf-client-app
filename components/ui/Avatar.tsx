import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

/** Round profile picture with a gold ring; falls back to initials. */
export function Avatar({ uri, name, size = 40, ring = true }: { uri?: string | null; name?: string | null; size?: number; ring?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials =
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '•';
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.wrap, box, ring && styles.ring]} accessibilityLabel={name ? `${name}'s photo` : 'Profile photo'}>
      {uri && !failed ? (
        <Image source={{ uri }} style={box} onError={() => setFailed(true)} />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(11, size * 0.38) }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#2A2414', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { borderWidth: 1.5, borderColor: colors.borderAccent },
  initials: { color: colors.accentText, fontFamily: fonts.display },
});
