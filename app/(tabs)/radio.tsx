import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandHeader } from '../../components/ui/BrandHeader';
import { SectionCard, Eyebrow } from '../../components/ui/SectionCard';
import { colors, spacing, borderRadius, fontSize, fonts } from '../../lib/theme';
import {
  RadioEpisode,
  PlayerState,
  fetchEpisodes,
  fetchMixTracks,
  MixPlaylist,
  MIX_TITLES,
  getRadioPlayer,
  loadPositions,
  savePosition,
  loadSpeed,
  saveSpeed,
  fmtTime,
  RADIO_PAGE,
} from '../../lib/radio';

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const AUTO_KEY = 'fbf_radio_autonext';
const MODE_KEY = 'fbf_radio_mode';
type Mode = 'radio' | 'mix' | 'gamecock';
const MODES: Mode[] = ['radio', 'mix', 'gamecock'];
const MODE_LABEL: Record<Mode, string> = { radio: 'Radio', mix: 'Workout Mix', gamecock: 'Gamecocks' };
const MODE_ICON: Record<Mode, keyof typeof Ionicons.glyphMap> = {
  radio: 'radio-outline',
  mix: 'musical-notes-outline',
  gamecock: 'american-football-outline',
};
/** Song playlist shown in each music mode. */
const PLAYLIST_OF: Record<Exclude<Mode, 'radio'>, MixPlaylist> = { mix: 'workout', gamecock: 'gamecock' };

export default function RadioScreen() {
  const [episodes, setEpisodes] = useState<RadioEpisode[]>([]);
  const [tracks, setTracks] = useState<RadioEpisode[]>([]);
  const [gcTracks, setGcTracks] = useState<RadioEpisode[]>([]);
  const [mode, setMode] = useState<Mode>('radio');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<RadioEpisode | null>(null);
  const [state, setState] = useState<PlayerState>({ playing: false, position: 0, duration: 0, loading: false });
  const [speed, setSpeed] = useState(1);
  const [autoNext, setAutoNext] = useState(true);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [barWidth, setBarWidth] = useState(1);

  const player = getRadioPlayer();
  const epsRef = useRef<RadioEpisode[]>([]);
  const mixRef = useRef<RadioEpisode[]>([]);
  const gcRef = useRef<RadioEpisode[]>([]);
  const speedRef = useRef(1);
  const curRef = useRef<RadioEpisode | null>(null);
  const autoRef = useRef(true);
  const lastSave = useRef(0);
  epsRef.current = episodes;
  mixRef.current = tracks;
  gcRef.current = gcTracks;
  speedRef.current = speed;
  curRef.current = current;
  autoRef.current = autoNext;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [eps, pos, spd, auto, mix, gc, savedMode] = await Promise.all([
        fetchEpisodes(),
        loadPositions(),
        loadSpeed(),
        AsyncStorage.getItem(AUTO_KEY),
        fetchMixTracks('workout'),
        fetchMixTracks('gamecock'),
        AsyncStorage.getItem(MODE_KEY),
      ]);
      setEpisodes(eps);
      setTracks(mix);
      setGcTracks(gc);
      if (savedMode === 'mix' && mix.length) setMode('mix');
      if (savedMode === 'gamecock' && gc.length) setMode('gamecock');
      setPositions(pos);
      setSpeed(spd);
      player.setRate(spd);
      setAutoNext(auto !== '0');
    } catch (e: any) {
      setError('Could not load episodes. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [player]);

  useEffect(() => {
    load();
  }, [load]);

  const start = useCallback(
    async (ep: RadioEpisode, autoplay = true, fromStart = false) => {
      setCurrent(ep);
      const isMix = ep.kind === 'mix';
      // Songs always start at the top and play at normal speed; episodes resume where you left off.
      player.setRate(isMix ? 1 : speedRef.current);
      const pos = fromStart || isMix ? 0 : (await loadPositions())[String(ep.id)] || 0;
      await player.load(ep, pos, autoplay);
    },
    [player],
  );

  // Older episode = next in list (list is newest first).
  const step = useCallback(
    (dir: 1 | -1) => {
      const cur = curRef.current;
      if (!cur) return;
      const isMix = cur.kind === 'mix';
      const list = isMix ? (cur.playlist === 'gamecock' ? gcRef.current : mixRef.current) : epsRef.current;
      const i = list.findIndex((e) => e.id === cur.id);
      // Song playlists loop back to the first song so the music never stops mid-workout.
      const nxt = list[i + dir] || (isMix && list.length ? list[dir === 1 ? 0 : list.length - 1] : undefined);
      if (nxt) start(nxt, true, true);
    },
    [start],
  );

  useEffect(() => {
    const offState = player.onState((s) => {
      setState(s);
      const cur = curRef.current;
      if (cur && cur.kind !== 'mix' && s.position > 0 && Date.now() - lastSave.current > 5000) {
        lastSave.current = Date.now();
        savePosition(cur.id, s.position);
        setPositions((p) => ({ ...p, [cur.id]: s.position }));
      }
    });
    const offEnded = player.onEnded(() => {
      const cur = curRef.current;
      if (cur && cur.kind !== 'mix') {
        savePosition(cur.id, 0);
        setPositions((p) => ({ ...p, [cur.id]: 0 }));
      }
      if (autoRef.current) step(1);
    });
    player.onRemote({ next: () => step(1), previous: () => step(-1) });
    return () => {
      offState();
      offEnded();
    };
  }, [player, step]);

  const toggle = () => {
    if (!current) {
      const first = mode === 'radio' ? episodes[0] : songsFor(mode)[0];
      if (first) start(first);
      return;
    }
    state.playing ? player.pause() : player.play();
  };
  const skip = (d: number) => player.seekTo(Math.min(state.duration || 1e9, Math.max(0, state.position + d)));
  const cycleSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(s);
    if (current?.kind !== 'mix') player.setRate(s);
    saveSpeed(s);
  };
  const toggleAuto = () => {
    const v = !autoNext;
    setAutoNext(v);
    AsyncStorage.setItem(AUTO_KEY, v ? '1' : '0').catch(() => {});
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  };
  function songsFor(m: Mode): RadioEpisode[] {
    return m === 'gamecock' ? gcTracks : m === 'mix' ? tracks : [];
  }
  // Shuffle within the playlist that's playing (or the one on screen).
  const shuffle = () => {
    const m: Mode = current?.kind === 'mix' ? (current.playlist === 'gamecock' ? 'gamecock' : 'mix') : mode;
    const pool = songsFor(m === 'radio' ? 'mix' : m);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    switchMode(m === 'radio' ? 'mix' : m);
    start(pick, true, true);
  };
  const isMixList = mode !== 'radio';
  const listTitle = mode === 'radio' ? 'FBF Radio' : MIX_TITLES[PLAYLIST_OF[mode]];
  const list = isMixList ? songsFor(mode) : episodes;
  const curIsMix = current?.kind === 'mix';
  const curTitle = current?.playlist === 'gamecock' ? MIX_TITLES.gamecock : MIX_TITLES.workout;

  const dur = state.duration || current?.duration || 0;
  const pct = dur ? Math.min(1, state.position / dur) : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
    >
      <BrandHeader title="FBF Radio" />

      <View style={styles.segment} accessibilityRole="tablist">
        {MODES.map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => switchMode(m)}
            style={[styles.segBtn, mode === m && styles.segBtnOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
          >
            <Ionicons name={MODE_ICON[m]} size={16} color={mode === m ? colors.onAccent : colors.textSecondary} />
            <Text style={[styles.segText, mode === m && styles.segTextOn]} numberOfLines={1}>{MODE_LABEL[m]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionCard eyebrow="Now playing" highlight>
        <View style={styles.nowRow}>
          {current?.cover ? <Image source={{ uri: current.cover }} style={styles.cover} /> : (
            <View style={[styles.cover, styles.coverEmpty]}>
              <Ionicons name={MODE_ICON[mode]} size={32} color={colors.accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.nowTitle} numberOfLines={2}>
              {current
                ? current.title
                : isMixList
                  ? list[0]
                    ? `Tap play to start ${mode === 'gamecock' ? 'Gamecock Country' : 'the Workout Mix'}`
                    : listTitle
                  : episodes[0]
                    ? 'Tap play to start the newest episode'
                    : 'Knox & Maeve'}
            </Text>
            <Text style={styles.nowSub}>
              {current
                ? curIsMix
                  ? `${curTitle}${current.explicit ? '  ·  Explicit' : ''}`
                  : `Episode ${current.number}`
                : mode === 'gamecock'
                  ? 'Garnet & black country — Willy B, SEC roll call & more'
                  : isMixList
                  ? 'Our own songs — Big B, Hot Rod, Pyabro & the crew'
                  : 'Training talk for while you train'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={1}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width || 1)}
          onPress={(e) => dur && player.seekTo((e.nativeEvent.locationX / barWidth) * dur)}
          style={styles.barHit}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
        >
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{fmtTime(state.position)}</Text>
          <Text style={styles.time}>-{fmtTime(Math.max(0, dur - state.position))}</Text>
        </View>

        <View style={styles.controls}>
          {curIsMix || (!current && isMixList) ? (
            <TouchableOpacity onPress={shuffle} style={styles.pill} accessibilityLabel="Shuffle this playlist">
              <Ionicons name="shuffle" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={cycleSpeed} style={styles.pill} accessibilityLabel="Playback speed">
              <Text style={styles.pillText}>{speed}×</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => skip(-15)} accessibilityLabel="Back 15 seconds" disabled={!current}>
            <Ionicons name="play-back-outline" size={30} color={current ? colors.textPrimary : colors.textTertiary} />
            <Text style={styles.skipLabel}>15</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggle} style={styles.playBtn} accessibilityLabel={state.playing ? 'Pause' : 'Play'}>
            {state.loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Ionicons name={state.playing ? 'pause' : 'play'} size={34} color={colors.onAccent} style={!state.playing ? { marginLeft: 4 } : undefined} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => skip(30)} accessibilityLabel="Forward 30 seconds" disabled={!current}>
            <Ionicons name="play-forward-outline" size={30} color={current ? colors.textPrimary : colors.textTertiary} />
            <Text style={styles.skipLabel}>30</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleAuto} style={[styles.pill, autoNext && styles.pillOn]} accessibilityLabel="Auto-play next episode">
            <Ionicons name="infinite-outline" size={16} color={autoNext ? colors.onAccent : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          {Platform.OS === 'web'
            ? 'Keeps playing with your screen locked — control it from your lock screen, watch or headphones.'
            : 'Keeps playing in the background while you log sets.'}
        </Text>
      </SectionCard>

      <SectionCard
        eyebrow={isMixList ? listTitle : 'Episodes'}
        title={list.length ? `${list.length} ${isMixList ? (list.length === 1 ? 'song' : 'songs') : 'episodes'}` : undefined}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.xl }} />
        ) : error && !isMixList ? (
          <Text style={styles.empty}>{error}</Text>
        ) : !list.length ? (
          <Text style={styles.empty}>{isMixList ? `${listTitle} is on the way.` : 'New episodes are on the way.'}</Text>
        ) : (
          list.map((ep) => {
            const active = current?.id === ep.id;
            const pos = isMixList ? 0 : positions[String(ep.id)] || 0;
            const prog = ep.duration ? Math.min(1, pos / ep.duration) : 0;
            return (
              <TouchableOpacity key={ep.id} onPress={() => (active ? toggle() : start(ep))} style={[styles.ep, active && styles.epActive]}>
                <View style={[styles.epNum, active && styles.epNumActive]}>
                  {active && state.playing ? (
                    <Ionicons name="volume-high" size={16} color={colors.onAccent} />
                  ) : (
                    <Text style={[styles.epNumText, active && { color: colors.onAccent }]}>{ep.number}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.epTitle} numberOfLines={2}>
                    {ep.title}
                    {ep.explicit ? <Text style={styles.explicit}>  E</Text> : null}
                  </Text>
                  {!!ep.description && <Text style={styles.epDesc} numberOfLines={2}>{ep.description}</Text>}
                  <Text style={styles.epMeta}>
                    {ep.duration ? fmtTime(ep.duration) : ''}
                    {pos > 15 && prog < 0.97 ? `  ·  ${fmtTime(Math.max(0, ep.duration - pos))} left` : ''}
                  </Text>
                  {pos > 15 && prog < 0.97 && (
                    <View style={styles.epBar}>
                      <View style={[styles.epBarFill, { width: `${prog * 100}%` }]} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </SectionCard>

      {!isMixList && (
        <TouchableOpacity onPress={() => Linking.openURL(RADIO_PAGE)} style={styles.link}>
          <Eyebrow>Also on forgedbyfreedom.net/radio</Eyebrow>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg, maxWidth: 820, width: '100%', alignSelf: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cover: { width: 72, height: 72, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceSunken },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderAccent },
  nowTitle: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: fontSize.xl, lineHeight: 26 },
  nowSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  barHit: { paddingVertical: spacing.md, marginTop: spacing.md },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.accent },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.textTertiary, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { color: colors.textTertiary, fontSize: 10, textAlign: 'center', marginTop: -2 },
  pill: { minWidth: 48, height: 32, paddingHorizontal: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '600' },
  hint: { color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.lg },
  empty: { color: colors.textSecondary, fontSize: fontSize.md, paddingVertical: spacing.lg },
  ep: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  epActive: { backgroundColor: colors.accentMuted, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderTopColor: 'transparent' },
  epNum: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  epNumActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  epNumText: { color: colors.accentText, fontFamily: fonts.display, fontSize: fontSize.md },
  epTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },
  epDesc: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  epMeta: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4 },
  epBar: { height: 3, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden' },
  epBarFill: { height: 3, backgroundColor: colors.accent },
  link: { alignItems: 'center', paddingVertical: spacing.md },
  segment: { flexDirection: 'row', gap: spacing.sm, padding: 4, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSunken },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: borderRadius.full },
  segBtnOn: { backgroundColor: colors.accent },
  segText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  segTextOn: { color: colors.onAccent },
  explicit: { color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: '700' },
});
