// "Coach updates": program changes and notes a coach sent this member.
// The server keeps the inbox (fbf-sync/v1/inbox) and sends an app alert and
// an email for every entry; this module fetches it and tracks the unread
// count so the home screen badge stays current.
import { useSyncExternalStore } from 'react';
import { call } from './fbf-sync';

export interface CoachUpdate {
  id: string;
  at: string;
  kind: 'change' | 'note';
  from: string;
  title: string;
  body: string;
  /** What changed in the program (changes only). */
  lines?: string[];
  read: boolean;
}

interface InboxState {
  items: CoachUpdate[];
  unread: number;
  loaded: boolean;
}

let state: InboxState = { items: [], unread: 0, loaded: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function refreshInbox(): Promise<InboxState> {
  const r = await call<{ items: CoachUpdate[]; unread: number }>('/inbox');
  state = { items: r.items || [], unread: r.unread || 0, loaded: true };
  emit();
  return state;
}

export async function markAllRead(): Promise<void> {
  if (!state.unread) return;
  state = { ...state, unread: 0, items: state.items.map((i) => ({ ...i, read: true })) };
  emit();
  await call('/inbox/read', { method: 'POST', body: JSON.stringify({}) });
}

/** Tell the site which device to alert for this account. */
export function registerPushToken(token: string, platform: string) {
  return call('/push/register', { method: 'POST', body: JSON.stringify({ token, platform }) });
}

export function resetInbox() {
  state = { items: [], unread: 0, loaded: false };
  emit();
}

export function useCoachInbox(): InboxState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
