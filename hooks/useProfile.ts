// One shared copy of the member's profile picture (and their coach's), so the
// Today header, Profile tab and desktop sidebar update together.
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getProfile, uploadAvatar, deleteAvatar, HubProfile } from '../lib/hub';
import { onAuthEvent } from '../lib/wp-auth';

let state: { profile: HubProfile | null; loading: boolean; error: string | null } = { profile: null, loading: false, error: null };
let fetched = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<typeof state>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

// A new sign-in (or a dead session) must not keep the last account's profile
// or its error — reload on next use.
onAuthEvent(() => {
  fetched = false;
  set({ profile: null, loading: false, error: null });
});

export async function refreshProfile() {
  set({ loading: true });
  try {
    set({ profile: await getProfile(), error: null });
  } catch (e: any) {
    set({ error: e?.message ?? 'Could not load profile' });
  } finally {
    set({ loading: false });
  }
}

/** Opens the photo library (square crop on phones), uploads, and updates everywhere. Returns false if cancelled. */
export async function changeAvatar(): Promise<boolean> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 0.9,
  });
  if (r.canceled || !r.assets?.length) return false;
  const a = r.assets[0];
  set({ loading: true, error: null });
  try {
    const url = await uploadAvatar({ uri: a.uri, file: (a as any).file });
    set({ profile: state.profile ? { ...state.profile, avatar_url: url } : state.profile });
    if (!state.profile) await refreshProfile();
    return true;
  } catch (e: any) {
    set({ error: e?.message ?? 'Upload failed' });
    throw e;
  } finally {
    set({ loading: false });
  }
}

export async function removeAvatar() {
  set({ loading: true });
  try {
    await deleteAvatar();
    set({ profile: state.profile ? { ...state.profile, avatar_url: null } : null });
  } finally {
    set({ loading: false });
  }
}

export function useProfile() {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state
  );
  useEffect(() => {
    if (!fetched) {
      fetched = true;
      refreshProfile();
    }
  }, []);
  return snap;
}
