// FBF Radio — episode feed + a single shared audio player.
// Web (installable web app): an HTMLAudioElement + the Media Session API, so playback keeps going
// with the screen locked and the lock screen / Apple Watch / headphones control it.
// Native (iOS/Android): expo-audio with background playback and lock-screen controls.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WP_URL = process.env.EXPO_PUBLIC_WP_URL || 'https://forgedbyfreedom.net';
export const RADIO_FEED = `${WP_URL}/wp-json/fbf-radio/v1/episodes`;
export const RADIO_PAGE = `${WP_URL}/radio/`;

export type RadioEpisode = {
  id: number;
  number: number;
  title: string;
  description: string;
  audio: string;
  duration: number;
  cover: string;
  date: string;
  link: string;
  /** Set for songs (playlists kept separate from Radio episodes). */
  kind?: 'radio' | 'mix';
  /** Which song playlist: the Workout Mix or Gamecock Country. */
  playlist?: MixPlaylist;
  explicit?: boolean;
  artist?: string;
  album?: string;
};

export type MixPlaylist = 'workout' | 'gamecock';
export const MIX_TITLES: Record<MixPlaylist, string> = {
  workout: 'FBF Workout Mix',
  gamecock: 'Gamecock Country',
};

export const MIX_FEED = `${WP_URL}/wp-json/fbf-music/v1/tracks`;

/** Gamecock Country songs have "gc" sources; the plugin (1.1+) also says so itself. */
function playlistOf(t: any): MixPlaylist {
  if (t?.playlist === 'gamecock' || t?.playlist === 'workout') return t.playlist;
  return String(t?.source_id || '').startsWith('gc') ? 'gamecock' : 'workout';
}

/** The crew's own songs (FBF Workout Mix plugin), one playlist at a time. Empty if the plugin isn't installed yet. */
export async function fetchMixTracks(playlist: MixPlaylist = 'workout'): Promise<RadioEpisode[]> {
  try {
    const res = await fetch(`${MIX_FEED}?playlist=${playlist}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = Array.isArray(json?.tracks) ? json.tracks : [];
    // Older plugin versions return every song in one feed, so sort them into playlists here too.
    return list
      .filter((t) => playlistOf(t) === playlist)
      .map((t, i) => ({
        ...t,
        number: i + 1,
        kind: 'mix' as const,
        playlist,
        artist: MIX_TITLES[playlist],
        album: MIX_TITLES[playlist],
      }));
  } catch {
    return [];
  }
}

export async function fetchEpisodes(): Promise<RadioEpisode[]> {
  const res = await fetch(RADIO_FEED, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Radio feed error ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.episodes) ? json.episodes : [];
}

// ---- resume positions ----
const POS_KEY = 'fbf_radio_pos';
const SPEED_KEY = 'fbf_radio_speed';

export async function loadPositions(): Promise<Record<string, number>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(POS_KEY)) || '{}');
  } catch {
    return {};
  }
}
export async function savePosition(id: number, seconds: number) {
  try {
    const all = await loadPositions();
    all[String(id)] = seconds;
    await AsyncStorage.setItem(POS_KEY, JSON.stringify(all));
  } catch {}
}
export async function loadSpeed(): Promise<number> {
  try {
    return Number((await AsyncStorage.getItem(SPEED_KEY)) || 1) || 1;
  } catch {
    return 1;
  }
}
export async function saveSpeed(s: number) {
  try {
    await AsyncStorage.setItem(SPEED_KEY, String(s));
  } catch {}
}

// ---- player ----
export type PlayerState = { playing: boolean; position: number; duration: number; loading: boolean };
type Listener = (s: PlayerState) => void;

export interface RadioPlayer {
  load(ep: RadioEpisode, startAt: number, autoplay: boolean): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setRate(rate: number): void;
  onState(fn: Listener): () => void;
  onEnded(fn: () => void): () => void;
  onRemote(handlers: { next?: () => void; previous?: () => void }): void;
  destroy(): void;
}

function webPlayer(): RadioPlayer {
  const el: HTMLAudioElement = new (globalThis as any).Audio();
  el.preload = 'metadata';
  let rate = 1;
  const listeners = new Set<Listener>();
  const ended = new Set<() => void>();
  let remote: { next?: () => void; previous?: () => void } = {};
  const emit = () => {
    const s = {
      playing: !el.paused,
      position: el.currentTime || 0,
      duration: isFinite(el.duration) ? el.duration : 0,
      loading: el.readyState < 2 && !el.paused,
    };
    listeners.forEach((f) => f(s));
    const ms: any = (navigator as any).mediaSession;
    if (ms?.setPositionState && s.duration) {
      try {
        ms.setPositionState({ duration: s.duration, playbackRate: el.playbackRate, position: Math.min(s.position, s.duration) });
      } catch {}
    }
  };
  ['timeupdate', 'play', 'pause', 'loadedmetadata', 'waiting', 'playing'].forEach((e) => el.addEventListener(e, emit));
  el.addEventListener('ended', () => ended.forEach((f) => f()));

  const ms: any = (navigator as any).mediaSession;
  const setHandler = (a: string, fn: any) => {
    try {
      ms?.setActionHandler(a, fn);
    } catch {}
  };
  setHandler('play', () => el.play());
  setHandler('pause', () => el.pause());
  setHandler('seekbackward', (d: any) => (el.currentTime = Math.max(0, el.currentTime - (d?.seekOffset || 15))));
  setHandler('seekforward', (d: any) => (el.currentTime = Math.min(el.duration || 0, el.currentTime + (d?.seekOffset || 30))));
  setHandler('seekto', (d: any) => d?.seekTime != null && (el.currentTime = d.seekTime));
  setHandler('nexttrack', () => remote.next?.());
  setHandler('previoustrack', () => remote.previous?.());

  return {
    async load(ep, startAt, autoplay) {
      el.src = ep.audio;
      el.playbackRate = rate;
      if (ms) {
        try {
          ms.metadata = new (globalThis as any).MediaMetadata({
            title: ep.title,
            artist: ep.artist || 'Forged by Freedom Radio',
            album: ep.album || `Episode ${ep.number}`,
            artwork: [{ src: ep.cover, sizes: '512x512' }],
          });
        } catch {}
      }
      await new Promise<void>((resolve) => {
        const done = () => {
          el.removeEventListener('loadedmetadata', done);
          if (startAt > 0 && el.duration && startAt < el.duration - 15) el.currentTime = startAt;
          resolve();
        };
        el.addEventListener('loadedmetadata', done);
        setTimeout(done, 4000);
      });
      el.playbackRate = rate;
      if (autoplay) el.play().catch(() => {});
      emit();
    },
    play: () => void el.play().catch(() => {}),
    pause: () => el.pause(),
    seekTo: (s) => {
      el.currentTime = Math.max(0, s);
      emit();
    },
    setRate: (r) => {
      rate = r;
      el.playbackRate = r;
    },
    onState: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    onEnded: (fn) => {
      ended.add(fn);
      return () => ended.delete(fn);
    },
    onRemote: (h) => {
      remote = h;
    },
    destroy: () => {
      el.pause();
      el.removeAttribute('src');
    },
  };
}

function nativePlayer(): RadioPlayer {
  // Required lazily so the web bundle never touches native audio code paths.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const audio = require('expo-audio');
  let player: any = null;
  let rate = 1;
  let poll: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<Listener>();
  const ended = new Set<() => void>();
  let wasPlaying = false;
  const emit = () => {
    if (!player) return;
    const s = {
      playing: !!player.playing,
      position: player.currentTime || 0,
      duration: player.duration || 0,
      loading: !!player.isBuffering,
    };
    listeners.forEach((f) => f(s));
    if (wasPlaying && !s.playing && s.duration && s.position >= s.duration - 0.5) ended.forEach((f) => f());
    wasPlaying = s.playing;
  };
  return {
    async load(ep, startAt, autoplay) {
      await audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
      if (player) player.remove();
      player = audio.createAudioPlayer({ uri: ep.audio }, { updateInterval: 500 });
      try {
        player.setActiveForLockScreen?.(true, { title: ep.title, artist: ep.artist || 'Forged by Freedom Radio', albumTitle: ep.album || `Episode ${ep.number}`, artworkUrl: ep.cover });
      } catch {}
      player.setPlaybackRate?.(rate);
      if (startAt > 0) {
        try {
          await player.seekTo(startAt);
        } catch {}
      }
      if (autoplay) player.play();
      if (!poll) poll = setInterval(emit, 500);
      emit();
    },
    play: () => player?.play(),
    pause: () => player?.pause(),
    seekTo: (s) => {
      player?.seekTo(Math.max(0, s));
      emit();
    },
    setRate: (r) => {
      rate = r;
      player?.setPlaybackRate?.(r);
    },
    onState: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    onEnded: (fn) => {
      ended.add(fn);
      return () => ended.delete(fn);
    },
    onRemote: () => {},
    destroy: () => {
      if (poll) clearInterval(poll);
      poll = null;
      player?.remove();
      player = null;
    },
  };
}

let shared: RadioPlayer | null = null;
/** One player for the whole app, so audio keeps playing when you switch tabs. */
export function getRadioPlayer(): RadioPlayer {
  if (!shared) shared = Platform.OS === 'web' ? webPlayer() : nativePlayer();
  return shared;
}

export function fmtTime(s: number) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(x).padStart(2, '0')}`;
}
