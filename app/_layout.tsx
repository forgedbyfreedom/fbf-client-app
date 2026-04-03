import React, { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Stack, Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Loading } from '../components/ui/Loading';
import { colors } from '../lib/theme';

function RootNavigation() {
  const { session, loading } = useAuth();

  if (loading) return <Loading />;

  if (!session) return <Redirect href="/(auth)/login" />;

  return <Redirect href="/(tabs)" />;
}

function PushNotificationHandler() {
  usePushNotifications();
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
  const content = (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
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
      </Stack>
      <RootNavigation />
      {Platform.OS !== 'web' && <PushNotificationHandler />}
      <DeepLinkHandler />
    </AuthProvider>
  );

  // On web, constrain to phone-like width for preview
  if (Platform.OS === 'web') {
    return (
      <View style={webStyles.outer}>
        <View style={webStyles.phone}>{content}</View>
      </View>
    );
  }

  return content;
}

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  phone: {
    width: 390,
    maxWidth: '100%',
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
});
