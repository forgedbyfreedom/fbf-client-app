import React, { useEffect, useState } from 'react';
import { View, Image, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';

/**
 * Launch intro: the FBF motion logo (real footage, shipped as two frame sheets so it
 * plays on iPhone and web without a native video module), its original music, then the
 * shield slides left and the Team Yarbro logo animates in beside it.
 * Plays once per app launch. Tap anywhere to skip.
 */

const SHEETS = [require('../assets/intro/sheet0.jpg'), require('../assets/intro/sheet1.jpg')];
const VIGNETTE = require('../assets/intro/vignette.png');
const YARBRO = require('../assets/intro/team-yarbro.png');
const MUSIC = require('../assets/intro/intro.m4a');

const FPS = 15;
const FRAMES = 108; // 7.2 s of footage
const PER_SHEET = 54;
const COLS = 6;
const FOOTAGE_MS = (FRAMES / FPS) * 1000; // 7200
const MERGE_AT = 6700; // shield starts sliding aside just before the footage ends
const OUT_AT = 13200; // hold the finished lockup for ~6 s
const TOTAL = 13900;
const GOLD = '#D4A93A';

let played = false;

export default function LaunchIntro() {
  const [visible, setVisible] = useState(!played);
  if (!visible) return null;
  return <Intro onDone={() => setVisible(false)} />;
}

function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const D = Math.min(width, 520); // footage width (4:3 frame)
  const H = D * 0.75;
  const player = useAudioPlayer(MUSIC);

  const t = useSharedValue(0); // ms of footage
  const show = useSharedValue(0);
  const merge = useSharedValue(0);
  const yarbro = useSharedValue(0);
  const goldFlash = useSharedValue(0);
  const out = useSharedValue(1);
  const hint = useSharedValue(0);

  const finish = React.useRef(() => {});
  finish.current = () => {
    played = true;
    try {
      player.pause();
    } catch {}
    onDone();
  };

  useEffect(() => {
    try {
      player.volume = 1;
      player.play();
    } catch {
      // Browsers may block sound until the first tap; the visuals still play.
    }
    show.value = withTiming(1, { duration: 350 });
    t.value = withTiming(FOOTAGE_MS - 1, { duration: FOOTAGE_MS, easing: Easing.linear });
    merge.value = withDelay(MERGE_AT, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }));
    yarbro.value = withDelay(MERGE_AT + 500, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    goldFlash.value = withDelay(MERGE_AT + 500, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
    hint.value = withDelay(1200, withTiming(0.4, { duration: 600 }));
    out.value = withDelay(OUT_AT, withTiming(0, { duration: TOTAL - OUT_AT }));
    const timer = setTimeout(() => finish.current(), TOTAL);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    out.value = withTiming(0, { duration: 250 });
    setTimeout(() => finish.current(), 260);
  };

  const sheetStyle = (sheet: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const f = Math.min(FRAMES - 1, Math.floor((t.value / 1000) * FPS));
      const local = f - sheet * PER_SHEET;
      const col = ((local % COLS) + COLS) % COLS;
      const row = Math.floor(Math.max(local, 0) / COLS);
      const on = f >= sheet * PER_SHEET && f < (sheet + 1) * PER_SHEET;
      return { opacity: on ? 1 : 0, transform: [{ translateX: -col * D }, { translateY: -row * H }] };
    });
  const s0 = sheetStyle(0);
  const s1 = sheetStyle(1);

  const root = useAnimatedStyle(() => ({ opacity: out.value * show.value }));
  const shield = useAnimatedStyle(() => ({
    transform: [{ translateX: -0.14 * D * merge.value }, { scale: 1 - 0.38 * merge.value }],
  }));
  const yarbroH = 0.64 * D;
  const yarbroW = yarbroH * (223 / 640);
  const yarbroStyle = useAnimatedStyle(() => ({
    opacity: yarbro.value,
    transform: [{ translateY: 24 * (1 - yarbro.value) }, { scale: 0.92 + 0.08 * yarbro.value }],
  }));
  const goldStyle = useAnimatedStyle(() => ({ opacity: 1 - goldFlash.value }));
  const rule = useAnimatedStyle(() => ({ opacity: yarbro.value, transform: [{ scaleY: yarbro.value }] }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value * out.value }));

  return (
    <Animated.View style={[styles.root, root]} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityRole="button" accessibilityLabel="Skip intro">
        <View style={styles.center}>
          <View style={{ width: D, height: H }}>
            <Animated.View style={[{ width: D, height: H }, shield]}>
              <View style={{ width: D, height: H, overflow: 'hidden' }}>
                <Animated.Image source={SHEETS[0]} style={[styles.sheet, { width: 6 * D, height: 9 * H }, s0]} resizeMode="stretch" />
                <Animated.Image source={SHEETS[1]} style={[styles.sheet, { width: 6 * D, height: 9 * H }, s1]} resizeMode="stretch" />
                <Image source={VIGNETTE} style={{ position: 'absolute', left: 0, top: 0, width: D, height: H }} resizeMode="stretch" />
              </View>
            </Animated.View>

            <Animated.View style={[styles.rule, { height: 0.56 * H, left: D / 2 + 0.135 * D, top: H * 0.22 }, rule]} />

            <Animated.View style={[styles.yarbroWrap, { width: yarbroW, height: yarbroH, left: D / 2 + 0.165 * D, top: (H - yarbroH) / 2 }, yarbroStyle]}>
              <Image source={YARBRO} style={{ width: yarbroW, height: yarbroH }} resizeMode="contain" />
              <Animated.View style={[StyleSheet.absoluteFill, goldStyle]}>
                <Image source={YARBRO} style={{ width: yarbroW, height: yarbroH, tintColor: GOLD }} resizeMode="contain" />
              </Animated.View>
            </Animated.View>
          </View>
        </View>
        <Animated.Text style={[styles.hint, hintStyle]}>TAP TO SKIP</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 9999, elevation: 9999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, top: 0 },
  rule: { position: 'absolute', width: 1, backgroundColor: GOLD, opacity: 0.7 },
  yarbroWrap: { position: 'absolute' },
  hint: { position: 'absolute', bottom: 48, alignSelf: 'center', color: '#a1a1aa', fontSize: 11, letterSpacing: 2, fontWeight: '600' },
});
