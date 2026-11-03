import { useCallback, useEffect, useRef, useState } from 'react';
import type { HubCheckin, PhotoSlot } from '../lib/hub';
import { savePose } from '../lib/hub';
import { detectPose, PhotoPose } from '../lib/pose';

const key = (id: number, slot: PhotoSlot) => `${id}:${slot}`;

/**
 * Body keypoints for check-in photos. Uses what the server already has;
 * anything missing is detected on this device one photo at a time (the
 * photos you're looking at first, then the rest of the history) and saved
 * back so it never has to be done again.
 */
export function usePhotoPoses(checkins: HubCheckin[], priority: { id: number; slot: PhotoSlot }[]) {
  const [poses, setPoses] = useState<Record<string, PhotoPose>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const running = useRef(false);
  const failed = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  // Seed from the server cache.
  useEffect(() => {
    const seed: Record<string, PhotoPose> = {};
    for (const c of checkins) {
      for (const [slot, p] of Object.entries(c.poses ?? {})) {
        if (p) seed[key(c.id, slot as PhotoSlot)] = p as PhotoPose;
      }
    }
    setPoses((prev) => ({ ...seed, ...prev }));
  }, [checkins]);

  const queue = useCallback((): { id: number; slot: PhotoSlot; url: string }[] => {
    const out: { id: number; slot: PhotoSlot; url: string }[] = [];
    const seen = new Set<string>();
    const add = (id: number, slot: PhotoSlot) => {
      const k = key(id, slot);
      if (seen.has(k) || poses[k] || failed.current.has(k)) return;
      const c = checkins.find((x) => x.id === id);
      const url = c?.photo_urls[slot];
      if (!url) return;
      seen.add(k);
      out.push({ id, slot, url });
    };
    priority.forEach((p) => add(p.id, p.slot));
    // Then the rest of the history, same pose as the first priority item first.
    const first = priority[0]?.slot;
    const slots: PhotoSlot[] = first ? [first, ...(['front', 'side', 'back'] as PhotoSlot[]).filter((s) => s !== first)] : ['front', 'side', 'back'];
    for (const s of slots) for (const c of checkins) if (c.photos.includes(s)) add(c.id, s);
    return out;
  }, [checkins, poses, priority]);

  useEffect(() => {
    if (running.current) return;
    const next = queue()[0];
    if (!next) return;
    running.current = true;
    const k = key(next.id, next.slot);
    setBusy(k);
    (async () => {
      const found = await detectPose(next.url);
      const { error, ...pose } = found as PhotoPose & { error?: string };
      if (error) {
        // Network or model problem: don't record "no body", just skip this session.
        failed.current.add(k);
      } else {
        savePose(next.id, next.slot, pose).catch(() => undefined);
      }
      if (!mounted.current) return;
      running.current = false;
      setBusy(null);
      setPoses((p) => (error ? { ...p } : { ...p, [k]: pose }));
    })();
  }, [queue]);

  const get = useCallback((id: number, slot: PhotoSlot): PhotoPose | undefined => poses[key(id, slot)], [poses]);
  const redo = useCallback((id: number, slot: PhotoSlot) => {
    const k = key(id, slot);
    failed.current.delete(k);
    setPoses((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  }, []);
  return { get, busy, redo, isBusy: (id: number, slot: PhotoSlot) => busy === key(id, slot) };
}
