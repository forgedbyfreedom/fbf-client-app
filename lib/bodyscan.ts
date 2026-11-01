/**
 * Live body scan (paid product) — FBF BodyScan plugin on forgedbyfreedom.net.
 *
 *   GET  /fbf/v1/bodyscan/mine         scan history + pricing for this member
 *   GET  /fbf/v1/bodyscan/limits       upload limits (size / duration)
 *   POST /fbf/v1/bodyscan/submit       multipart: video + intake fields
 *   GET  /fbf/v1/bodyscan/report/:id   HTML report
 *
 * Not to be confused with the free InBody/DEXA document reader (lib/scans.ts)
 * or bloodwork — three separate products.
 * Works on iOS/Android (file URI) and on the web app (File/Blob).
 */
import { Platform } from 'react-native';
import { getToken, wpApiRoot } from './wp-auth';

export interface ScanIntake {
  sex: 'male' | 'female';
  age?: number;
  height_in: number;
  weight_lb: number;
  neck_in?: number;
  chest_in?: number;
  waist_in?: number;
  hips_in?: number;
  thigh_in?: number;
  arm_in?: number;
}

export interface ScanSummary {
  id: number;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  created_at: string;
  bf_percent: number | null;
  bf_low: number | null;
  bf_high: number | null;
  category: string | null;
  lean_mass_kg: number | null;
  measurements: Record<string, unknown> | null;
  warnings: string[];
  fail_reason: string | null;
}

export interface ScanPricing {
  mode: 'free' | 'paid' | 'denied';
  price_usd: number;
  payment_url: string;
  credits: number;
}

export interface MineResponse {
  scans: ScanSummary[];
  pricing: ScanPricing;
}

export interface PickedVideo {
  uri: string;
  file?: Blob; // web only
  size?: number | null;
  name?: string;
  type?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Please log in again.');
  return { Authorization: `Bearer ${token}` };
}

export async function listScans(): Promise<MineResponse> {
  const res = await fetch(`${wpApiRoot}/bodyscan/mine`, { headers: await authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Could not load scans (${res.status})`);
  return { scans: body.scans ?? [], pricing: body.pricing ?? { mode: 'denied', price_usd: 0, payment_url: '', credits: 0 } };
}

/** Max upload size in bytes, if the server says. Never throws. */
export async function maxUploadBytes(): Promise<number | null> {
  try {
    const res = await fetch(`${wpApiRoot}/bodyscan/limits`, { headers: await authHeaders() });
    if (!res.ok) return null;
    const j = await res.json();
    const bytes = j?.max_bytes ?? j?.max_upload_bytes ?? j?.upload_max_bytes;
    if (typeof bytes === 'number' && bytes > 0) return bytes;
    const mb = j?.max_mb ?? j?.max_upload_mb;
    if (typeof mb === 'number' && mb > 0) return mb * 1024 * 1024;
    return null;
  } catch {
    return null;
  }
}

export class PaymentRequiredError extends Error {
  constructor(public priceUsd: number, public paymentUrl: string, msg: string) {
    super(msg);
    this.name = 'PaymentRequiredError';
  }
}

export async function submitScan(video: PickedVideo, intake: ScanIntake): Promise<{ id: number; status: string; message: string }> {
  const form = new FormData();
  const name = video.name || 'scan.mp4';
  const type = video.type || (name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4');
  if (Platform.OS === 'web') {
    const blob = video.file ?? (await (await fetch(video.uri)).blob());
    form.append('video', blob, name);
  } else {
    form.append('video', { uri: video.uri, name, type } as any);
  }
  Object.entries(intake).forEach(([k, v]) => {
    if (v !== undefined && v !== null && !(typeof v === 'number' && isNaN(v))) form.append(k, String(v));
  });

  const res = await fetch(`${wpApiRoot}/bodyscan/submit`, { method: 'POST', headers: await authHeaders(), body: form });
  const body = await res.json().catch(() => ({}));
  if (res.status === 402) {
    const d = body?.data ?? {};
    throw new PaymentRequiredError(d.price_usd ?? 0, d.payment_url ?? '', body?.message ?? 'Payment is needed for this scan.');
  }
  if (res.status === 413) throw new Error('That video is too large. Record a shorter turn (12–20 seconds).');
  if (!res.ok) throw new Error(body?.message ?? `Upload failed (${res.status})`);
  return body;
}

export async function fetchReportHtml(id: number): Promise<string> {
  const res = await fetch(`${wpApiRoot}/bodyscan/report/${id}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`Report not ready yet (${res.status})`);
  return res.text();
}

/** "waist_in" → "Waist", value formatting for measurement lists. */
export function measurementRows(m: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!m) return [];
  const unitFor = (k: string) => (k.endsWith('_in') ? ' in' : k.endsWith('_cm') ? ' cm' : k.endsWith('_kg') ? ' kg' : k.endsWith('_lb') ? ' lb' : k.endsWith('_pct') ? '%' : '');
  return Object.entries(m)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== ''))
    .map(([k, v]) => {
      const label = k.replace(/_(in|cm|kg|lb|pct)$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const value = typeof v === 'number' ? `${Math.round(v * 10) / 10}${unitFor(k)}` : String(v);
      return { label, value };
    });
}

export const kgToLb = (kg: number | null | undefined) => (kg == null ? null : Math.round(kg * 2.20462 * 10) / 10);
