import { Platform, useWindowDimensions } from 'react-native';

/** Desktop web: a browser window at least 1024px wide. Phones and the native apps are never "desktop". */
export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 1024;
}

/** Width of the readable content column on desktop. */
export const DESKTOP_CONTENT_MAX = 1120;
