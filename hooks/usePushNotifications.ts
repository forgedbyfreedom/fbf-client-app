import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { refreshInbox, registerPushToken } from '../lib/coach-inbox';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return tokenData.data;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);
  const router = useRouter();
  const { session, user } = useAuth();
  const userId = session ? (user as any)?.id ?? 'signed-in' : null;

  // Register this device with forgedbyfreedom.net for the signed-in account
  // (again after every sign-in, so alerts follow whoever is using the phone).
  useEffect(() => {
    if (Platform.OS === 'web' || !userId) return;
    registerForPushNotifications()
      .then(async (token) => {
        if (!token) return;
        setExpoPushToken(token);
        await registerPushToken(token, Platform.OS);
      })
      .catch((err) => console.warn('[push] register failed', err?.message || err));
  }, [userId]);

  useEffect(() => {
    // Skip push notification setup on web
    if (Platform.OS === 'web') return;

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((n) => {
        setNotification(n);
        const t = String(n.request.content.data?.type || '');
        if (t.startsWith('coach_')) refreshInbox().catch(() => undefined);
      });

    // Handle notification tap (opens app)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (typeof data?.type === 'string' && data.type.startsWith('coach_')) {
          router.push('/coach-updates');
        } else if (data?.type === 'checkin_reminder') {
          router.push('/(tabs)/checkin');
        } else if (data?.type === 'chat_message') {
          router.push('/(tabs)/chat');
        } else if (data?.type === 'badge_earned') {
          router.push('/(tabs)/profile');
        } else {
          router.push('/(tabs)');
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return { expoPushToken, notification };
}
