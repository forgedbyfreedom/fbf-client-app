/**
 * BodyScan API client — talks to the FBF BodyScan plugin on WordPress.
 *
 * Endpoints (all under /wp-json/fbf/v1, auth via the wp-auth Bearer token):
 *   POST /bodyscan/submit   multipart: video + intake fields
 *   GET  /bodyscan/mine     scan history + pricing/credits for this user
 *   GET  /bodyscan/report/:id   HTML report
 */

import { getToken, wpApiRoot } from './wp-auth';

export interface ScanIntake {
  sex: 'male' | 'female';
  age?: number;
  height_in: number;      // inches
  weight_lb: number;      // pounds
  // optional tape measurements, inches — tape overrides the 3D scan value
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

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Not logged in');
  return { Authorization: `Bearer ${token}` };
}

export async function listScans(): Promise<MineResponse> {
  const res = await fetch(`${wpApiRoot()}/bodyscan/mine`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`listScans failed (${res.status})`);
  return res.json();
}

export class PaymentRequiredError extends Error {
  constructor(public priceUsd: number, public paymentUrl: string, msg: string) {
    super(msg);
    this.name = 'PaymentRequiredError';
  }
}

/**
 * Upload a scan video + intake. videoUri is the local file URI from
 * expo-camera / expo-image-picker. Throws PaymentRequiredError when the
 * client's tier needs a paid credit first.
 */
export async function submitScan(
  videoUri: string,
  intake: ScanIntake,
): Promise<{ id: number; status: string; message: string }> {
  const form = new FormData();
  // @ts-expect-error React Native FormData file shape
  form.append('video', { uri: videoUri, name: 'scan.mp4', type: 'video/mp4' });
  Object.entries(intake).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
  });

  const res = await fetch(`${wpApiRoot()}/bodyscan/submit`, {
    method: 'POST',
    headers: await authHeaders(), // no Content-Type: RN sets the boundary
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (res.status === 402) {
    const data = body?.data ?? {};
    throw new PaymentRequiredError(
      data.price_usd ?? 0,
      data.payment_url ?? '',
      body?.message ?? 'Payment required for this scan.',
    );
  }
  if (!res.ok) {
    throw new Error(body?.message ?? `submitScan failed (${res.status})`);
  }
  return body;
}

/** URL for the HTML report (open in a WebView with the auth header). */
export function reportUrl(id: number): string {
  return `${wpApiRoot()}/bodyscan/report/${id}`;
}

export async function fetchReportHtml(id: number): Promise<string> {
  const res = await fetch(reportUrl(id), { headers: await authHeaders() });
  if (!res.ok) throw new Error(`Report not ready (${res.status})`);
  return res.text();
}
