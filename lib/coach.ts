// Coach console client (FBF Health Sync plugin, fbf-sync/v1/coach/*).
// A request is two steps: ask() returns a preview and a pending id —
// nothing is saved — then confirm(id) applies exactly what was previewed.
import { call } from './fbf-sync';

export interface CoachClient {
  id: number;
  name: string;
  email: string;
  has_program: boolean;
  approved: boolean;
  coach: string | null;
  can_undo: boolean;
}

export interface CoachInfo {
  id: number;
  name: string;
  email: string;
  clients: number;
}

export interface CoachMe {
  is_coach: boolean;
  is_head: boolean;
  clients: CoachClient[];
  coaches?: CoachInfo[];
}

export interface PreviewChange {
  type: 'program_change' | 'add_coach' | 'remove_coach' | 'assign' | 'unassign';
  title: string;
  client_id?: number;
  client_name?: string;
  edits?: { before: string; after: string }[];
  note?: string;
}

export interface AskResult {
  id?: string;
  clarify?: string;
  changes?: PreviewChange[];
  warnings?: string[];
  summary: string;
}

export const coachApi = {
  me: () => call<CoachMe>('/coach/me'),
  // Planning + drafting edits runs two AI calls server-side.
  ask: (text: string) => call<AskResult>('/coach/ask', { method: 'POST', body: JSON.stringify({ text }) }, 150000),
  confirm: (id: string) =>
    call<{ summary: string; applied: string[] }>('/coach/confirm', { method: 'POST', body: JSON.stringify({ id }) }, 60000),
  cancel: (id: string) => call<{ summary: string }>('/coach/cancel', { method: 'POST', body: JSON.stringify({ id }) }),
  undo: (clientId: number) =>
    call<{ summary: string }>('/coach/undo', { method: 'POST', body: JSON.stringify({ client_id: clientId }) }),
};
