import React, { useMemo, useEffect } from 'react';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { DesktopShell } from '../components/desktop/DesktopShell';
import { View, Platform, StyleSheet, AppState, useWindowDimensions } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import LaunchIntro from '../components/LaunchIntro';
import { Loading } from '../components/ui/Loading';
import { colors } from '../lib/theme';
import { syncHealth } from '../lib/health-sync';
import { refreshInbox, resetInbox } from '../lib/coach-inbox';
import { flush as flushFoodLog } from '../lib/food-log-store';
import { useFonts, Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';

/**
 * Sends signed-out visitors to sign-in and signed-in members out of it — but
 * only when they are in the wrong place. (It used to render a <Redirect> on
 * every render, so any re-render, e.g. the iPhone keyboard resizing the browser
 * window, re-opened the sign-in screen and threw away the field being typed in,
 * and resizing a desktop window bounced members back to Today.)
 */
function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuth = segments[0] === '(auth)';

  useEffect(() => {
    if (loading) return;
    if (!session && !inAuth) router.replace('/(auth)/login');
    else if (session && inAuth) router.replace('/(tabs)');
  }, [session, loading, inAuth, router]);

  if (loading) return <Loading />;
  return null;
}

function PushNotificationHandler() {
  usePushNotifications();
  return null;
}

/**
 * While signed in: push Apple Health to the site and drain any food-log
 * changes saved offline — on launch and every time the app comes back to
 * the foreground. Both are throttled/idempotent, so this is cheap.
 */
function BackgroundSyncHandler() {
  const { session } = useAuth();
  useEffect(() => {
    if (!session) {
      resetInbox(); // never show the previous account's coach updates
      return;
    }
    const run = () => {
      syncHealth().catch(() => undefined);
      flushFoodLog().catch(() => undefined);
      refreshInbox().catch(() => undefined);
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [session]);
  return null;
}

function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path?.startsWith('checkin/')) {
        const token = parsed.path.replace('checkin/', '');
        if (token) {
          router.push(`/checkin/0?token=${token}`);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}

async function checkForUpdates() {
  if (__DEV__) return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (_) {}
}

export default function RootLayout() {
  useEffect(() => { checkForUpdates(); }, []);
  // Display font for headings. Never blocks rendering: until it loads (or if
  // it fails) text falls back to the system font.
  useFonts({ Oswald_600SemiBold, Oswald_700Bold });
  const desktop = useIsDesktop();
  const { width } = useWindowDimensions();
  // Desktop only: centre pages outside the tab shell (880px column) and sign-in (440px).
  // On phones these stay 0, and screenOptions keeps the same identity when the
  // window resizes (the keyboard opening on iPhone); a new screenOptions on every
  // resize made the web stack redraw the sign-in form and drop the tapped field.
  const sidePad = desktop ? Math.round(Math.max(24, (width - 248 - 880) / 2)) : 0;
  const authPad = desktop ? Math.round(Math.max(24, (width - 440) / 2)) : 0;
  const screenOptions = useMemo(
    () =>
      ({ route }: { route: { name: string } }) => ({
        headerShown: false,
        contentStyle:
          desktop && route.name === '(auth)'
            ? { backgroundColor: colors.background, paddingHorizontal: authPad }
            : desktop && route.name !== '(tabs)'
              ? { backgroundColor: colors.background, paddingHorizontal: sidePad }
              : { backgroundColor: colors.background },
        animation: 'fade' as const,
      }),
    [desktop, sidePad, authPad]
  );
  const content = (
    <AuthProvider>
      <StatusBar style="light" />
      <DesktopShell>
      <Stack
        screenOptions={screenOptions}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="checkin/[step]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="admin/clients"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="admin/coaches"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="admin/client-detail"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="admin/create-client"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="supplements/index"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="progress"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="weekly-checkin"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="older-photos" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bodyscan/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bodyscan/capture" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="bodyscan/report" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="client/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="gyms/index"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="food-log/index"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="challenges/index"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="challenges/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="coach-updates"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      </DesktopShell>
      <RootNavigation />
      {Platform.OS !== 'web' && <PushNotificationHandler />}
      <BackgroundSyncHandler />
      <DeepLinkHandler />
      <LaunchIntro />
    </AuthProvider>
  );

  // Web: full window. Phones get the normal layout; desktop windows get the
  // sidebar (tabs layout) and centred content columns.
  if (Platform.OS === 'web') {
    return <View style={webStyles.outer}>{content}</View>;
  }

  return content;
}

const webStyles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background },
});
