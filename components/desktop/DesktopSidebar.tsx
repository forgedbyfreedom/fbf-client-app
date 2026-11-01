import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { useProfile } from '../../hooks/useProfile';
import { colors, fonts, spacing } from '../../lib/theme';

type Item = { route: string; label: string; icon: keyof typeof Ionicons.glyphMap; show?: boolean };

const TAB_PATH: Record<string, string> = {
  index: '/',
  workouts: '/workouts',
  meals: '/meals',
  chat: '/chat',
  'ai-coach': '/ai-coach',
  coach: '/coach',
  admin: '/admin',
  profile: '/profile',
};

/** Left navigation for the web app on a desktop-width window. Shown on every page (replaces the phone tab bar). */
export function DesktopSidebar({ isCoach, isAdmin }: { isCoach: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { profile } = useProfile();
  const current = Object.keys(TAB_PATH).find((k) => (k === 'index' ? pathname === '/' : pathname === TAB_PATH[k] || pathname.startsWith(TAB_PATH[k] + '/')));
  const linkActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const main: Item[] = [
    { route: 'index', label: 'Today', icon: 'home-outline' },
    { route: 'workouts', label: 'Train', icon: 'barbell-outline' },
    { route: 'meals', label: 'Meals', icon: 'nutrition-outline' },
    { route: 'chat', label: 'Messages', icon: 'chatbubble-outline' },
    { route: 'ai-coach', label: 'AI Coach', icon: 'fitness-outline' },
  ];
  const more: Item[] = [
    { route: 'coach', label: 'Coach', icon: 'clipboard-outline', show: isCoach },
    { route: 'admin', label: 'Admin', icon: 'shield-outline', show: isAdmin },
  ];
  const links: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[] = [
    { label: 'Progress', icon: 'trending-up-outline', href: '/progress' },
    { label: 'Weekly check-in', icon: 'camera-outline', href: '/weekly-checkin' },
    { label: 'Body scan', icon: 'scan-outline', href: '/bodyscan' },
    { label: 'Peptides', icon: 'flask-outline', href: '/peptides' },
  ];

  const go = (name: string) => router.navigate((name === 'index' ? '/(tabs)' : `/(tabs)/${name}`) as any);

  const NavRow = ({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active?: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: !!active }}
      style={({ hovered }: any) => [styles.row, active && styles.rowActive, hovered && !active && styles.rowHover]}
    >
      <Ionicons name={icon} size={19} color={active ? colors.accentText : colors.textSecondary} />
      <Text style={[styles.rowText, active && styles.rowTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.bar}>
      <View style={styles.brand}>
        <Image source={require('../../assets/fbf-logo.jpg')} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.brandName}>FORGED BY FREEDOM</Text>
          <Text style={styles.brandSub}>MONSTERS ARE REAL</Text>
        </View>
      </View>

      <Pressable onPress={() => router.push('/checkin/0')} style={({ hovered }: any) => [styles.cta, hovered && { opacity: 0.9 }]} accessibilityRole="button">
        <Ionicons name="add" size={18} color={colors.onAccent} />
        <Text style={styles.ctaText}>Daily check-in</Text>
      </Pressable>

      <View style={styles.group}>
        {main.map((i) => (
          <NavRow key={i.route} label={i.label} icon={i.icon} active={current === i.route} onPress={() => go(i.route)} />
        ))}
      </View>

      {more.some((i) => i.show) ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>COACHING</Text>
          {more.filter((i) => i.show).map((i) => (
            <NavRow key={i.route} label={i.label} icon={i.icon} active={current === i.route} onPress={() => go(i.route)} />
          ))}
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={styles.groupLabel}>TRACK</Text>
        {links.map((l) => (
          <NavRow key={l.href} label={l.label} icon={l.icon} active={linkActive(l.href)} onPress={() => router.navigate(l.href as any)} />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={() => go('profile')}
        style={({ hovered }: any) => [styles.me, current === 'profile' && styles.rowActive, hovered && current !== 'profile' && styles.rowHover]}
        accessibilityRole="link"
      >
        <Avatar uri={profile?.avatar_url} name={profile?.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.meName} numberOfLines={1}>{profile?.name ?? 'Profile'}</Text>
          <Text style={styles.meSub}>Profile & settings</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: 248, backgroundColor: '#0d0d0f', borderRightWidth: 1, borderRightColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 4 },
  logo: { width: 34, height: 34, borderRadius: 6 },
  brandName: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 14, letterSpacing: 1 },
  brandSub: { color: colors.textTertiary, fontSize: 9, letterSpacing: 1.6 },
  cta: { minHeight: 44, borderRadius: 12, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaText: { color: colors.onAccent, fontWeight: '700' },
  group: { gap: 2 },
  groupLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', paddingHorizontal: 10, marginTop: 6, marginBottom: 4 },
  row: { minHeight: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10 },
  rowActive: { backgroundColor: '#2A2414' },
  rowHover: { backgroundColor: colors.surface },
  rowText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  rowTextActive: { color: colors.accentText },
  me: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  meName: { color: colors.textPrimary, fontWeight: '600' },
  meSub: { color: colors.textTertiary, fontSize: 11 },
});
