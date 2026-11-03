import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Modal,
  Platform,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionCard } from '../ui/SectionCard';
import type { HubCheckin, PhotoSlot } from '../../lib/hub';
import { alignTransform, PhotoPose } from '../../lib/pose';
import { usePhotoPoses } from '../../hooks/usePhotoPoses';
import { exportComparison } from '../../lib/photo-export';
import { colors, fontSize, fonts, spacing } from '../../lib/theme';

/**
 * Physique lab: every check-in's photos on one timeline, compared side by
 * side, with a swipe divider, or as an overlay. Photos are auto-aligned on
 * shoulders and hips (PoseNet, cached per photo) so size and position match
 * even when the camera distance changed. Drag / pinch / +/- for manual
 * tweaks. Alignment only changes the view; the original photos never change.
 */
const POSES: PhotoSlot[] = ['front', 'side', 'back'];
type Mode = 'side' | 'swipe' | 'overlay';
type Pick = 'before' | 'after';
interface Adj {
  x: number;
  y: number;
  z: number;
}
const ZERO: Adj = { x: 0, y: 0, z: 1 };
const FRAME_RATIO = 4 / 3; // height / width

const fmt = (iso: string, year = false) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) });
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/* ---------- image size (needed to compute the contain box) ---------- */
const sizeCache = new Map<string, { w: number; h: number }>();
function useImageSize(uri: string | undefined, pose?: PhotoPose) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(() =>
    pose?.w && pose?.h ? { w: pose.w, h: pose.h } : uri && sizeCache.get(uri.split('?')[0]) ? sizeCache.get(uri.split('?')[0])! : null
  );
  useEffect(() => {
    if (pose?.w && pose?.h) {
      setSize({ w: pose.w, h: pose.h });
      return;
    }
    if (!uri) return;
    const k = uri.split('?')[0];
    const hit = sizeCache.get(k);
    if (hit) {
      setSize(hit);
      return;
    }
    let live = true;
    Image.getSize(
      uri,
      (w, h) => {
        sizeCache.set(k, { w, h });
        if (live) setSize({ w, h });
      },
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [uri, pose?.w, pose?.h]);
  return size;
}

/** Final transform for one photo in a frame: auto alignment × manual tweak. */
export function photoTransform(pose: PhotoPose | undefined, size: { w: number; h: number } | null, fw: number, fh: number, auto: boolean, adj: Adj) {
  const base = auto && size ? alignTransform(pose, size.w, size.h, fw, fh) : null;
  const s = (base?.scale ?? 1) * adj.z;
  return { scale: s, x: (base?.x ?? 0) * adj.z + adj.x, y: (base?.y ?? 0) * adj.z + adj.y, aligned: !!base };
}

function AlignedPhoto({ uri, pose, fw, fh, auto, adj, opacity = 1, clipWidth }: { uri: string; pose?: PhotoPose; fw: number; fh: number; auto: boolean; adj: Adj; opacity?: number; clipWidth?: number }) {
  const size = useImageSize(uri, pose);
  const t = photoTransform(pose, size, fw, fh, auto, adj);
  const img = (
    <Image
      source={{ uri }}
      resizeMode="contain"
      style={{ position: 'absolute', left: 0, top: 0, width: fw, height: fh, opacity, transform: [{ translateX: t.x }, { translateY: t.y }, { scale: t.scale }] }}
    />
  );
  if (clipWidth == null) return img;
  return <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(0, clipWidth), overflow: 'hidden' }}>{img}</View>;
}

/* ---------- the lab ---------- */

interface LabProps {
  checkins: HubCheckin[];
  title?: string;
  /** Shown on the client's own lab: opens "add older photos". */
  onAddOlder?: () => void;
}

export function PhotoLab(props: LabProps) {
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const state = useLabState(props.checkins);
  const withPhotos = state.withPhotos;

  if (withPhotos.length === 0) {
    return (
      <SectionCard eyebrow="Physique lab" title={props.title ?? 'Photo comparison'} subtitle="Your photos appear here after your first weekly check-in.">
        {props.onAddOlder ? <AddOlderLink onPress={props.onAddOlder} /> : null}
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard
        eyebrow="Physique lab"
        title={props.title ?? 'Photo comparison'}
        subtitle={state.subtitle}
        right={
          <TouchableOpacity onPress={() => setExpanded(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Expand comparison">
            <Ionicons name="expand-outline" size={18} color={colors.accentText} />
          </TouchableOpacity>
        }
      >
        <LabBody state={state} />
        {props.onAddOlder ? <AddOlderLink onPress={props.onAddOlder} /> : null}
      </SectionCard>
      <Modal visible={expanded} animationType="fade" onRequestClose={() => setExpanded(false)} presentationStyle="fullScreen">
        <View style={[styles.full, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.fullTop}>
            <Text style={styles.fullTitle}>{props.title ?? 'Photo comparison'}</Text>
            <TouchableOpacity onPress={() => setExpanded(false)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            <LabBody state={state} big />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function AddOlderLink({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.addOlder} accessibilityRole="button">
      <Ionicons name="time-outline" size={16} color={colors.accentText} />
      <Text style={styles.addOlderText}>Add older photos to your timeline</Text>
    </TouchableOpacity>
  );
}

function useLabState(checkins: HubCheckin[]) {
  const withPhotos = useMemo(
    () => [...checkins].filter((c) => c.photos.length > 0).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [checkins]
  );
  const [pose, setPose] = useState<PhotoSlot>('front');
  const forPose = useMemo(() => withPhotos.filter((c) => c.photos.includes(pose)), [withPhotos, pose]);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [active, setActive] = useState<Pick>('before');
  const [mode, setMode] = useState<Mode>('side');
  const [auto, setAuto] = useState(true);
  const [adj, setAdj] = useState<{ before: Adj; after: Adj }>({ before: ZERO, after: ZERO });
  const [target, setTarget] = useState<'before' | 'after' | 'both'>('both');
  const [divider, setDivider] = useState(0.5);
  const [opacity, setOpacity] = useState(0.5);

  // Default: oldest vs newest for this pose, and keep picks valid.
  useEffect(() => {
    if (!forPose.length) return;
    if (!forPose.some((c) => c.id === afterId)) setAfterId(forPose[0].id);
    if (!forPose.some((c) => c.id === beforeId)) setBeforeId(forPose[forPose.length - 1].id);
  }, [forPose]); // eslint-disable-line react-hooks/exhaustive-deps

  const before = forPose.find((c) => c.id === beforeId) ?? forPose[forPose.length - 1];
  const after = forPose.find((c) => c.id === afterId) ?? forPose[0];
  useEffect(() => setAdj({ before: ZERO, after: ZERO }), [before?.id, after?.id, pose]);

  const priority = useMemo(
    () => (before && after ? [{ id: after.id, slot: pose }, { id: before.id, slot: pose }] : []),
    [before?.id, after?.id, pose] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const poses = usePhotoPoses(withPhotos, priority);

  const bw = before?.fields.weight_lbs;
  const aw = after?.fields.weight_lbs;
  const days = before && after ? Math.round((new Date(after.created_at).getTime() - new Date(before.created_at).getTime()) / 86400000) : 0;
  const delta = bw != null && aw != null && before?.id !== after?.id ? aw - bw : null;
  const subtitle =
    before && after && before.id !== after.id
      ? [days > 0 ? `${days} days apart` : null, delta != null ? `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1)} lb` : null].filter(Boolean).join(' · ') || undefined
      : forPose.length < 2
        ? 'Save a second check-in to compare dates.'
        : undefined;

  const assign = (id: number) => {
    if (active === 'before') {
      setBeforeId(id);
      setActive('after');
    } else {
      setAfterId(id);
    }
  };

  return {
    withPhotos, forPose, pose, setPose, before, after, active, setActive, assign,
    mode, setMode, auto, setAuto, adj, setAdj, target, setTarget, divider, setDivider, opacity, setOpacity,
    poses, subtitle,
  };
}
type LabState = ReturnType<typeof useLabState>;

function LabBody({ state, big }: { state: LabState; big?: boolean }) {
  const { before, after, pose, mode, auto, adj, poses } = state;
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));
  const gap = spacing.sm;
  const frameW = mode === 'side' ? Math.floor((w - gap) / 2) : Math.min(w, big ? 720 : 520);
  const frameH = Math.round(frameW * FRAME_RATIO);
  const bp = before ? poses.get(before.id, pose) : undefined;
  const ap = after ? poses.get(after.id, pose) : undefined;
  const finding = (before && poses.isBusy(before.id, pose)) || (after && poses.isBusy(after.id, pose));
  const missing = [before && bp && !bp.ok ? before : null, after && ap && !ap.ok && after.id !== before?.id ? after : null].filter(Boolean) as HubCheckin[];
  const aligned = auto && bp?.ok && ap?.ok;

  const status = !auto
    ? 'Auto align is off. Drag, pinch or use + / − to line up.'
    : finding
      ? 'Finding shoulders and hips…'
      : missing.length
        ? `No clear body found in the ${missing.map((c) => fmt(c.created_at)).join(' and ')} photo. Drag or use + / − to line up.`
        : aligned
          ? 'Aligned on shoulders and hips. Drag, pinch or use + / − to fine-tune.'
          : 'Drag, pinch or use + / − to line up.';

  /* gestures: drag moves, pinch zooms (target photo); swipe mode drags the divider */
  const g = useRef({ startAdj: { before: ZERO, after: ZERO }, startDist: 0, startDiv: 0.5 });
  const stRef = useRef(state);
  stRef.current = state;
  const sizeRef = useRef({ frameW, frameH, gap });
  sizeRef.current = { frameW, frameH, gap };
  const dist = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    return t && t.length >= 2 ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : 0;
  };
  const makePan = (frame: Pick | 'stack') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dx) + Math.abs(gs.dy) > 3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const s = stRef.current;
        g.current.startAdj = s.adj;
        g.current.startDist = dist(e);
        g.current.startDiv = s.divider;
      },
      onPanResponderMove: (e, gs) => {
        const s = stRef.current;
        const { frameW: fw } = sizeRef.current;
        if (s.mode === 'swipe') {
          s.setDivider(Math.max(0, Math.min(1, g.current.startDiv + gs.dx / Math.max(1, fw))));
          return;
        }
        const d = dist(e);
        if (d && !g.current.startDist) g.current.startDist = d; // second finger landed mid-gesture
        // Side by side: the photo you touch moves, unless "Move both" is on.
        const which: Pick[] = s.target === 'both' ? ['before', 'after'] : frame === 'stack' ? [s.target] : [frame];
        const next = { ...g.current.startAdj };
        for (const k of which) {
          const a = g.current.startAdj[k];
          next[k] = d && g.current.startDist
            ? { ...a, z: Math.max(0.3, Math.min(4, a.z * (d / g.current.startDist))) }
            : { ...a, x: a.x + gs.dx, y: a.y + gs.dy };
        }
        s.setAdj(next);
      },
    });
  const pans = useMemo(() => ({ before: makePan('before'), after: makePan('after'), stack: makePan('stack') }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const nudge = (dz: number) => {
    const which: ('before' | 'after')[] = state.target === 'both' ? ['before', 'after'] : [state.target];
    const next = { ...state.adj };
    for (const k of which) next[k] = { ...next[k], z: Math.max(0.3, Math.min(4, next[k].z * dz)) };
    state.setAdj(next);
  };

  const label = (c: HubCheckin | undefined, side: Pick) =>
    c ? (
      <View style={[styles.tag, side === 'after' ? { right: 8 } : { left: 8 }]} pointerEvents="none">
        <Text style={[styles.tagText, side === 'after' && { color: colors.accentText }]}>
          {fmt(c.created_at, true)}
          {c.fields.weight_lbs != null ? ` · ${c.fields.weight_lbs} lb` : ''}
        </Text>
      </View>
    ) : null;

  const doExport = async () => {
    if (!before || !after) return;
    const bu = before.photo_urls[pose];
    const au = after.photo_urls[pose];
    if (!bu || !au) return;
    await exportComparison({
      before: { url: bu, pose: bp, adj: adj.before, label: `${fmt(before.created_at, true)}${before.fields.weight_lbs != null ? ` · ${before.fields.weight_lbs} lb` : ''}` },
      after: { url: au, pose: ap, adj: adj.after, label: `${fmt(after.created_at, true)}${after.fields.weight_lbs != null ? ` · ${after.fields.weight_lbs} lb` : ''}` },
      auto,
      frameW: mode === 'side' ? frameW : Math.floor((frameW - gap) / 2),
      title: `${cap(pose)} · ${state.subtitle ?? ''}`,
    }).catch(() => undefined);
  };

  const bu = before?.photo_urls[pose];
  const au = after?.photo_urls[pose];

  return (
    <View style={{ gap: spacing.md }} onLayout={onLayout}>
      {/* pose + mode */}
      <View style={styles.row}>
        {POSES.map((p) => (
          <Chip key={p} on={pose === p} onPress={() => state.setPose(p)} label={cap(p)} />
        ))}
      </View>
      <View style={styles.segment}>
        {([['side', 'Split', 'copy-outline'], ['swipe', 'Swipe', 'swap-horizontal-outline'], ['overlay', 'Overlay', 'layers-outline']] as const).map(([m, l, i]) => (
          <TouchableOpacity key={m} onPress={() => state.setMode(m)} style={[styles.segBtn, mode === m && styles.segOn]} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
            <Ionicons name={i} size={14} color={mode === m ? colors.accentText : colors.textSecondary} />
            <Text style={[styles.chipText, mode === m && styles.chipTextOn]} numberOfLines={1}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* stage */}
      {w > 0 && before && after && bu && au ? (
        <View style={{ alignItems: 'center' }}>
          {mode === 'side' ? (
            <View style={{ flexDirection: 'row', gap }}>
              {[{ c: before, u: bu, p: bp, k: 'before' as Pick }, { c: after, u: au, p: ap, k: 'after' as Pick }].map((f) => (
                <View key={f.k} style={[styles.frame, { width: frameW, height: frameH }]} {...pans[f.k].panHandlers}>
                  <AlignedPhoto uri={f.u} pose={f.p} fw={frameW} fh={frameH} auto={auto} adj={adj[f.k]} />
                  <Guides />
                  {label(f.c, f.k)}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.frame, { width: frameW, height: frameH }]} {...pans.stack.panHandlers}>
              <AlignedPhoto uri={au} pose={ap} fw={frameW} fh={frameH} auto={auto} adj={adj.after} />
              {mode === 'swipe' ? (
                <>
                  <AlignedPhoto uri={bu} pose={bp} fw={frameW} fh={frameH} auto={auto} adj={adj.before} clipWidth={state.divider * frameW} />
                  <View style={[styles.divider, { left: state.divider * frameW - 1 }]} pointerEvents="none">
                    <View style={styles.knob}>
                      <Ionicons name="code-outline" size={16} color={colors.onAccent} />
                    </View>
                  </View>
                </>
              ) : (
                <AlignedPhoto uri={bu} pose={bp} fw={frameW} fh={frameH} auto={auto} adj={adj.before} opacity={state.opacity} />
              )}
              <Guides />
              {label(before, 'before')}
              {label(after, 'after')}
            </View>
          )}
        </View>
      ) : null}

      <Text style={styles.status}>{status}</Text>

      {mode === 'overlay' ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.small}>Earlier photo opacity · {Math.round(state.opacity * 100)}%</Text>
          <Slider value={state.opacity} onChange={state.setOpacity} label="Earlier photo opacity" />
        </View>
      ) : null}

      {/* manual controls */}
      <View style={styles.row}>
        {mode !== 'swipe' ? (
          <>
            {(['before', 'after', 'both'] as const).map((t) => (
              <Chip key={t} small on={state.target === t} onPress={() => state.setTarget(t)} label={t === 'both' ? 'Move both' : `Move ${t}`} />
            ))}
          </>
        ) : (
          <Text style={styles.small}>Drag across the photo to move the divider.</Text>
        )}
      </View>
      <View style={styles.row}>
        <RoundBtn icon="remove" label="Smaller" onPress={() => nudge(1 / 1.06)} disabled={mode === 'swipe'} />
        <RoundBtn icon="add" label="Bigger" onPress={() => nudge(1.06)} disabled={mode === 'swipe'} />
        <TouchableOpacity
          onPress={() => state.setAuto(!auto)}
          style={[styles.pill, auto && styles.pillOn]}
          accessibilityRole="switch"
          accessibilityState={{ checked: auto }}
        >
          <Ionicons name="sparkles-outline" size={15} color={auto ? colors.accentText : colors.textSecondary} />
          <Text style={[styles.pillText, auto && { color: colors.accentText }]}>Auto align</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => state.setAdj({ before: ZERO, after: ZERO })} style={styles.pill} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.pillText}>Reset</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' ? (
          <TouchableOpacity onPress={doExport} style={styles.pill} accessibilityRole="button">
            <Ionicons name="download-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.pillText}>Save image</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* timeline */}
      <View style={{ gap: 8 }}>
        <View style={styles.row}>
          <PickChip on={state.active === 'before'} onPress={() => state.setActive('before')} label="Before" value={before ? fmt(before.created_at, true) : '—'} />
          <PickChip on={state.active === 'after'} onPress={() => state.setActive('after')} label="After" value={after ? fmt(after.created_at, true) : '—'} />
        </View>
        <Text style={styles.small}>
          {state.forPose.length} {cap(pose).toLowerCase()} photo{state.forPose.length === 1 ? '' : 's'} on your timeline · tap one to set {state.active === 'before' ? 'Before' : 'After'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {state.forPose.map((c) => {
            const isB = c.id === before?.id;
            const isA = c.id === after?.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => state.assign(c.id)}
                style={[styles.thumbWrap, (isA || isB) && styles.thumbOn]}
                accessibilityRole="button"
                accessibilityLabel={`${cap(pose)} photo ${fmt(c.created_at, true)}`}
              >
                <Image source={{ uri: c.photo_urls[pose] }} style={styles.thumb} resizeMode="cover" />
                <Text style={styles.thumbDate}>{fmt(c.created_at)}</Text>
                <Text style={styles.thumbSub}>
                  {isB ? 'Before' : isA ? 'After' : c.fields.weight_lbs != null ? `${c.fields.weight_lbs} lb` : c.fields.historical ? 'Older' : ' '}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

/** Head, shoulder-line, hip-line and feet guides (where auto align puts the body). */
function Guides() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0.34, 0.6].map((y) => (
        <View key={y} style={[styles.guide, { top: `${y * 100}%` }]} />
      ))}
      <View style={styles.center} />
    </View>
  );
}

function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [w, setW] = useState(1);
  const ref = useRef({ w: 1, start: 0 });
  ref.current.w = w;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const v = Math.max(0, Math.min(1, e.nativeEvent.locationX / ref.current.w));
          ref.current.start = v;
          onChange(v);
        },
        onPanResponderMove: (_e, gs) => onChange(Math.max(0, Math.min(1, ref.current.start + gs.dx / ref.current.w))),
      }),
    [onChange]
  );
  return (
    <View
      style={styles.sliderTrack}
      onLayout={(e) => setW(Math.max(1, e.nativeEvent.layout.width))}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))}
      {...pan.panHandlers}
    >
      <View style={styles.sliderBase} pointerEvents="none" />
      <View style={[styles.sliderFill, { width: `${value * 100}%` }]} pointerEvents="none" />
      <View style={[styles.sliderKnob, { left: value * w - 11 }]} pointerEvents="none" />
    </View>
  );
}

function Chip({ on, onPress, label, icon, small }: { on: boolean; onPress: () => void; label: string; icon?: string; small?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, small && { minHeight: 36 }, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {icon ? <Ionicons name={icon as any} size={14} color={on ? colors.accentText : colors.textSecondary} /> : null}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PickChip({ on, onPress, label, value }: { on: boolean; onPress: () => void; label: string; value: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pick, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Choose ${label} photo, currently ${value}`}>
      <Text style={[styles.pickLabel, on && { color: colors.accentText }]}>{label.toUpperCase()}</Text>
      <Text style={styles.pickValue}>{value}</Text>
    </TouchableOpacity>
  );
}

function RoundBtn({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.round, disabled && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon as any} size={18} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  segment: { flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  segOn: { backgroundColor: '#2A2414' },
  frame: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border },
  tag: { position: 'absolute', bottom: 8, backgroundColor: 'rgba(10,10,11,0.75)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  guide: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(212,169,58,0.22)' },
  center: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(212,169,58,0.14)' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  knob: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  status: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  small: { color: colors.textSecondary, fontSize: 12 },
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { borderColor: colors.accent, backgroundColor: '#2A2414' },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  chipTextOn: { color: colors.accentText },
  pick: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, paddingHorizontal: 12, justifyContent: 'center' },
  pickLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pickValue: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 17 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.borderLight, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillOn: { borderColor: colors.accent },
  pillText: { color: colors.textSecondary, fontWeight: '600', fontSize: fontSize.sm },
  thumbWrap: { width: 74, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 3, gap: 2, alignItems: 'center' },
  thumbOn: { borderColor: colors.accent },
  thumb: { width: 66, height: 88, borderRadius: 7, backgroundColor: colors.surfaceSunken },
  thumbDate: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  thumbSub: { color: colors.textSecondary, fontSize: 10 },
  sliderTrack: { height: 32, justifyContent: 'center', borderRadius: 16 },
  sliderBase: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: colors.border },
  sliderFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  sliderKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentText },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  full: { flex: 1, backgroundColor: colors.background },
  fullTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  fullTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 22 },
  addOlder: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, marginTop: spacing.sm },
  addOlderText: { color: colors.accentText, fontWeight: '600', fontSize: fontSize.sm },
});
