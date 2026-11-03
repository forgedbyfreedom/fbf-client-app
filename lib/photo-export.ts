/**
 * Save the current comparison (both photos with their alignment, dates and
 * weights) as one PNG. Web app only; the native app uses screenshots.
 */
import { Platform } from 'react-native';
import { alignTransform, PhotoPose } from './pose';

interface Side {
  url: string;
  pose?: PhotoPose;
  adj: { x: number; y: number; z: number };
  label: string;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' }); // an <img> copy in the cache has no CORS header
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const obj = URL.createObjectURL(await res.blob());
  const img = new (globalThis as any).Image() as HTMLImageElement;
  img.src = obj;
  await img.decode();
  return img;
}

export async function exportComparison(opts: { before: Side; after: Side; auto: boolean; frameW: number; title: string }) {
  if (Platform.OS !== 'web') return;
  const [bi, ai] = await Promise.all([loadImage(opts.before.url), loadImage(opts.after.url)]);
  const FW = 600; // output frame width
  const FH = 800;
  const k = FW / Math.max(1, opts.frameW); // manual offsets were in on-screen pixels
  const pad = 24;
  const top = 64;
  const canvas = document.createElement('canvas');
  canvas.width = FW * 2 + pad * 3;
  canvas.height = FH + top + pad + 40;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#D4A93A';
  ctx.font = '700 22px Inter, Arial, sans-serif';
  ctx.fillText('FORGED BY FREEDOM · PHYSIQUE COMPARISON', pad, 40);

  const draw = (img: HTMLImageElement, side: Side, x0: number, gold: boolean) => {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const base = opts.auto ? alignTransform(side.pose, iw, ih, FW, FH) : null;
    const s = (base?.scale ?? 1) * side.adj.z;
    const tx = (base?.x ?? 0) * side.adj.z + side.adj.x * k;
    const ty = (base?.y ?? 0) * side.adj.z + side.adj.y * k;
    const c = Math.min(FW / iw, FH / ih);
    const w = iw * c;
    const h = ih * c;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, top, FW, FH);
    ctx.clip();
    ctx.fillStyle = '#141416';
    ctx.fillRect(x0, top, FW, FH);
    // scale about the frame centre, then translate (same as the on-screen view)
    ctx.translate(x0 + FW / 2 + tx, top + FH / 2 + ty);
    ctx.scale(s, s);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.fillStyle = gold ? '#E2C26B' : '#f5f5f4';
    ctx.font = '700 20px Inter, Arial, sans-serif';
    ctx.fillText(side.label, x0, top + FH + 30);
  };
  draw(bi, opts.before, pad, false);
  draw(ai, opts.after, pad * 2 + FW, true);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 16px Inter, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(opts.title, canvas.width - pad, 40);

  const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fbf-comparison-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
