// Body-composition scans (InBody, DEXA, …) on forgedbyfreedom.net
// (fbf-sync/v1/scans). The member attaches the report; the site reads the
// numbers off it and returns them pre-filled for a one-tap save.
import { call } from './fbf-sync';
import { BodyScan } from '../types';

export type ScanType = 'inbody' | 'dexa' | 'bodpod' | 'calipers' | 'other';

export interface ScanValues {
  scan_type: ScanType;
  scan_date: string | null;
  body_fat_pct: number | null;
  total_weight_lbs: number | null;
  lean_mass_lbs: number | null;
  fat_mass_lbs: number | null;
  skeletal_muscle_mass_lbs: number | null;
  body_water_lbs: number | null;
  bmi: number | null;
  visceral_fat_level: number | null;
  visceral_fat_mass_lbs: number | null;
  basal_metabolic_rate: number | null;
  bone_mineral_content_lbs: number | null;
  bone_density_t_score: number | null;
  right_arm_lbs: number | null;
  left_arm_lbs: number | null;
  trunk_lbs: number | null;
  right_leg_lbs: number | null;
  left_leg_lbs: number | null;
  other: { label: string; value: number; unit?: string }[];
  facility: string | null;
  notes: string | null;
}

export interface ReadResult {
  upload_id: string;
  values: ScanValues;
  found: number;
  summary: string;
}

// ~730 KB of file per request: comfortably under typical PHP post limits.
const CHUNK_CHARS = 1_000_000;

async function fileToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result || '');
      const i = s.indexOf(',');
      i >= 0 ? resolve(s.slice(i + 1)) : reject(new Error('Could not read that file.'));
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(blob);
  });
}

/** Upload the report and have the site read it. */
export async function uploadAndReadScan(uri: string, onStage?: (s: 'upload' | 'read', pct?: number) => void): Promise<ReadResult> {
  const b64 = await fileToBase64(uri);
  if (b64.length > 27_000_000) throw new Error('That file is too large (20 MB max).');
  const parts = Math.max(1, Math.ceil(b64.length / CHUNK_CHARS));
  let uploadId: string | null = null;
  for (let i = 0; i < parts; i++) {
    onStage?.('upload', Math.round((i / parts) * 100));
    const r: { upload_id: string } = await call(
      '/scans/upload',
      {
        method: 'POST',
        body: JSON.stringify({
          chunk: b64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS),
          index: i,
          total: parts,
          upload_id: uploadId,
        }),
      },
      60000
    );
    uploadId = r.upload_id;
  }
  onStage?.('read');
  return call<ReadResult>('/scans/extract', { method: 'POST', body: JSON.stringify({ upload_id: uploadId }) }, 170000);
}

export const scansApi = {
  list: () => call<{ scans: BodyScan[] }>('/scans').then((r) => r.scans || []),
  save: (v: Partial<ScanValues> & { upload_id?: string | null; read_by_ai?: boolean }) =>
    call<{ scan: BodyScan }>('/scans', { method: 'POST', body: JSON.stringify(v) }),
  remove: (id: string) => call('/scans/' + encodeURIComponent(id), { method: 'DELETE' }),
};
