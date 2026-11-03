/**
 * Body keypoints for progress-photo auto alignment.
 *
 * PoseNet (MobileNetV1 0.75, quantized, ~2.5 MB) runs on the device with the
 * pure-JS CPU backend, so it works the same in the web app and the native
 * app without any new native module. Weights are self-hosted under
 * /ai/posenet on app.forgedbyfreedom.org.
 *
 * Each photo is analysed once; the result (shoulder + hip midpoints, as
 * fractions of the photo) is cached on the server with the check-in so every
 * later comparison, on any device, aligns instantly.
 */
import { Platform } from 'react-native';

export interface PhotoPose {
  v?: number;
  ok: boolean;
  /** shoulder midpoint */
  sx?: number;
  sy?: number;
  /** hip midpoint */
  hx?: number;
  hy?: number;
  /** nose */
  nx?: number;
  ny?: number;
  /** ankle midpoint */
  ax?: number;
  ay?: number;
  score?: number | null;
  /** photo size in pixels (not stored server-side; for local use only) */
  w?: number;
  h?: number;
}

const WEB_MODEL = '/ai/posenet/model-stride16.json';
const NATIVE_MODEL = 'https://app.forgedbyfreedom.org/ai/posenet/model-stride16.json';
const MAX_SIDE = 640; // analysis resolution; plenty for torso landmarks
const MIN_PART = 0.5;

let modelPromise: Promise<any> | null = null;
let tfRef: any = null;

/* ---------------- tiny UTF-8 helpers (Hermes lacks TextDecoder) ---------------- */
function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}
function utf8Decode(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    if (c < 0x80) s += String.fromCharCode(c);
    else if (c < 0xe0) s += String.fromCharCode(((c & 31) << 6) | (b[i++] & 63));
    else if (c < 0xf0) s += String.fromCharCode(((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
    else {
      const cp = (((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63)) - 0x10000;
      s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023));
    }
  }
  return s;
}

async function loadModel() {
  const tf = await import('@tensorflow/tfjs-core');
  await import('@tensorflow/tfjs-backend-cpu');
  await import('@tensorflow/tfjs-converter');
  if (Platform.OS !== 'web') {
    // React Native is neither a browser nor Node, so give TF.js the basics.
    try {
      tf.setPlatform('fbf-native', {
        fetch: (path: string, init?: any) => fetch(path, init),
        now: () => Date.now(),
        encode: (text: string) => utf8Encode(text),
        decode: (bytes: Uint8Array) => utf8Decode(bytes),
        isTypedArray: (a: unknown): a is Float32Array | Int32Array | Uint8Array | Uint8ClampedArray =>
          a instanceof Float32Array || a instanceof Int32Array || a instanceof Uint8Array || a instanceof Uint8ClampedArray,
      } as any);
    } catch {
      // already registered
    }
  }
  await tf.setBackend('cpu');
  await tf.ready();
  tfRef = tf;
  const posenet = await import('@tensorflow-models/posenet');
  return posenet.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: 257,
    multiplier: 0.75,
    quantBytes: 2,
    modelUrl: Platform.OS === 'web' ? WEB_MODEL : NATIVE_MODEL,
  });
}

function model() {
  if (!modelPromise) {
    modelPromise = loadModel().catch((e) => {
      modelPromise = null;
      throw e;
    });
  }
  return modelPromise;
}

/** RGB pixels (row-major, 3 bytes) of a downscaled copy of the photo. */
interface Pixels {
  data: Uint8Array;
  width: number;
  height: number;
  srcW: number;
  srcH: number;
}

async function webPixels(url: string): Promise<Pixels> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' }); // an <img> copy in the cache has no CORS header
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const blob = await res.blob();
  const bmp: any = typeof createImageBitmap === 'function' ? await createImageBitmap(blob) : null;
  let src: any = bmp;
  let objUrl: string | null = null;
  if (!src) {
    objUrl = URL.createObjectURL(blob);
    const img = new (globalThis as any).Image();
    img.src = objUrl;
    await img.decode();
    src = img;
  }
  try {
    const sw = src.naturalWidth || src.width;
    const sh = src.naturalHeight || src.height;
    const k = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * k));
    const h = Math.max(1, Math.round(sh * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(src, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const rgb = new Uint8Array(w * h * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i];
      rgb[j + 1] = rgba[i + 1];
      rgb[j + 2] = rgba[i + 2];
    }
    return { data: rgb, width: w, height: h, srcW: sw, srcH: sh };
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl);
    bmp?.close?.();
  }
}

async function nativePixels(url: string): Promise<Pixels> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const jpeg = await import('jpeg-js');
  const decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256, maxResolutionInMP: 40 });
  return downscale(decoded.data as Uint8Array, decoded.width, decoded.height);
}

/** Box-filter downscale of RGBA to RGB at MAX_SIDE. Exported for tests. */
export function downscale(rgba: Uint8Array, sw: number, sh: number): Pixels {
  const k = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k));
  const h = Math.max(1, Math.round(sh * k));
  const out = new Uint8Array(w * h * 3);
  const fx = sw / w;
  const fy = sh / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
      let r = 0, g = 0, b = 0, n = 0;
      // Sample at most a 4x4 grid inside the box: fast and smooth enough.
      const sx = Math.max(1, Math.floor((x1 - x0) / 4));
      const sy = Math.max(1, Math.floor((y1 - y0) / 4));
      for (let yy = y0; yy < y1; yy += sy) {
        const row = yy * sw;
        for (let xx = x0; xx < x1; xx += sx) {
          const p = (row + xx) * 4;
          r += rgba[p];
          g += rgba[p + 1];
          b += rgba[p + 2];
          n++;
        }
      }
      const o = (y * w + x) * 3;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
    }
  }
  return { data: out, width: w, height: h, srcW: sw, srcH: sh };
}

/** Turn PoseNet keypoints into the cached shape. */
export function summarize(keypoints: { part: string; score: number; position: { x: number; y: number } }[], w: number, h: number, score: number): PhotoPose {
  const kp = (part: string) => {
    const k = keypoints.find((p) => p.part === part);
    return k && k.score >= MIN_PART && k.position.x >= 0 && k.position.x <= w && k.position.y >= 0 && k.position.y <= h ? k : null;
  };
  const mid = (a: string, b: string) => {
    const pa = kp(a);
    const pb = kp(b);
    const pts = [pa, pb].filter(Boolean) as { position: { x: number; y: number } }[];
    if (!pts.length) return null;
    return {
      x: pts.reduce((s, p) => s + p.position.x, 0) / pts.length / w,
      y: pts.reduce((s, p) => s + p.position.y, 0) / pts.length / h,
    };
  };
  // Pair shoulders with hips on the same side(s) so a side pose still works.
  const pairs = (['left', 'right'] as const).filter((s) => kp(`${s}Shoulder`) && kp(`${s}Hip`));
  if (!pairs.length || score < 0.25) return { ok: false };
  const avg = (part: 'Shoulder' | 'Hip') => ({
    x: pairs.reduce((s, side) => s + kp(`${side}${part}`)!.position.x, 0) / pairs.length / w,
    y: pairs.reduce((s, side) => s + kp(`${side}${part}`)!.position.y, 0) / pairs.length / h,
  });
  const sh = avg('Shoulder');
  const hp = avg('Hip');
  // Torso must be a sensible size and the right way up.
  if (hp.y - sh.y < 0.04) return { ok: false };
  const nose = kp('nose');
  const ank = mid('leftAnkle', 'rightAnkle');
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return {
    v: 1,
    ok: true,
    sx: r(sh.x),
    sy: r(sh.y),
    hx: r(hp.x),
    hy: r(hp.y),
    ...(nose ? { nx: r(nose.position.x / w), ny: r(nose.position.y / h) } : {}),
    ...(ank ? { ax: r(ank.x), ay: r(ank.y) } : {}),
    score: Math.round(score * 1000) / 1000,
  };
}

/** Detect the body in one photo URL. Never throws: returns {ok:false} on any failure. */
export async function detectPose(url: string): Promise<PhotoPose & { error?: string }> {
  try {
    const net = await model();
    const px = Platform.OS === 'web' ? await webPixels(url) : await nativePixels(url);
    const tf = tfRef;
    const input = tf.tensor3d(px.data, [px.height, px.width, 3], 'int32');
    try {
      const pose = await net.estimateSinglePose(input, { flipHorizontal: false });
      return { ...summarize(pose.keypoints, px.width, px.height, pose.score), w: px.srcW, h: px.srcH };
    } finally {
      input.dispose();
    }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/* ---------------- alignment math ---------------- */

export interface ViewTransform {
  scale: number;
  x: number; // px
  y: number; // px
}

/** Where the torso goes in every frame. */
const TORSO_FRAC = 0.26; // shoulder→hip distance as a fraction of frame height
const HIP_Y = 0.6; // hip midpoint height in the frame

/**
 * Transform (scale about the frame centre, then translate) that puts this
 * photo's torso in the standard spot. The photo is drawn with "contain" in
 * a frame of fw×fh. Returns null when the pose isn't usable.
 */
export function alignTransform(pose: PhotoPose | null | undefined, iw: number, ih: number, fw: number, fh: number): ViewTransform | null {
  if (!pose?.ok || pose.sx == null || pose.sy == null || pose.hx == null || pose.hy == null || !iw || !ih || !fw || !fh) return null;
  const c = Math.min(fw / iw, fh / ih);
  const w = iw * c;
  const h = ih * c;
  const d = Math.hypot((pose.hx - pose.sx) * w, (pose.hy - pose.sy) * h);
  if (d < fh * 0.03) return null;
  const scale = (fh * TORSO_FRAC) / d;
  if (scale < 0.25 || scale > 5) return null;
  return {
    scale,
    x: -scale * (pose.hx - 0.5) * w,
    y: HIP_Y * fh - fh / 2 - scale * (pose.hy - 0.5) * h,
  };
}
