import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCoachStatus } from '../../hooks/useCoachStatus';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { DesktopSidebar } from './DesktopSidebar';
import { colors } from '../../lib/theme';

const NO_SIDEBAR = ['/login', '/sign-in', '/forgot', '/register', '/onboarding'];

/** Desktop web: persistent sidebar beside every signed-in page. Phones and the native apps render children untouched. */
export function DesktopShell({ children }: { children: React.ReactNode }) {
  const desktop = useIsDesktop();
  const { session, isAdmin } = useAuth();
  const isCoach = useCoachStatus();
  const pathname = usePathname() || '/';
  if (!desktop || !session || NO_SIDEBAR.some((p) => pathname.startsWith(p)) || pathname.includes('capture')) {
    return <>{children}</>;
  }
  return (
    <View style={styles.row}>
      <DesktopSidebar isCoach={!!isCoach} isAdmin={!!isAdmin} />
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  main: { flex: 1, minWidth: 0, backgroundColor: colors.background },
});
