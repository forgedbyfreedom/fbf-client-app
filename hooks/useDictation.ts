// Tap-to-talk dictation.
//  • Web app: the browser's own speech recognition (live words, nothing uploaded),
//    falling back to recording + server transcription where the browser has none.
//  • iPhone/Android: records a short clip (expo-audio, already in the app) and the
//    site transcribes it (FBF Coach Hub → OpenAI). The audio is not kept.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { transcribeAudio } from '../lib/hub';

export type DictationState = 'idle' | 'listening' | 'transcribing';
const MAX_SECONDS = 60;

function webSpeech(): any {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useDictation(onText: (text: string) => void) {
  const [state, _setState] = useState<DictationState>('idle');
  const stateRef = useRef<DictationState>('idle');
  const setState = (v: DictationState) => {
    stateRef.current = v;
    _setState(v);
  };
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recog = useRef<any>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => {
    clearTimer();
    try {
      recog.current?.abort?.();
    } catch {}
  }, []);

  const stop = useCallback(async () => {
    clearTimer();
    if (recog.current) {
      recog.current.stop(); // onend finishes up
      return;
    }
    if (stateRef.current !== 'listening') return;
    setState('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording came through. Try again.');
      const text = await transcribeAudio(
        Platform.OS === 'web'
          ? { uri, name: 'meal.webm', type: 'audio/webm' }
          : { uri, name: 'meal.m4a', type: 'audio/m4a' }
      );
      onTextRef.current(text);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't understand that. Try again or type it.");
    } finally {
      setState('idle');
    }
  }, [recorder]);

  const start = useCallback(async () => {
    setError(null);
    setInterim('');
    setSeconds(0);
    const SR = webSpeech();
    if (SR) {
      const r = new SR();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      let finalText = '';
      r.onresult = (ev: any) => {
        let live = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) finalText += res[0].transcript + ' ';
          else live += res[0].transcript;
        }
        setInterim((finalText + live).trim());
      };
      r.onerror = (ev: any) => {
        setError(
          ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed'
            ? 'Microphone access is blocked. Allow it in your browser (the icon in the address bar), then try again.'
            : ev?.error === 'no-speech'
              ? "Didn't hear anything. Tap the mic and say what you ate."
              : "Couldn't hear that. Try again or type it."
        );
      };
      r.onend = () => {
        clearTimer();
        recog.current = null;
        const t = finalText.trim();
        if (t) onTextRef.current(t);
        setInterim('');
        setState('idle');
      };
      recog.current = r;
      try {
        r.start();
      } catch {
        recog.current = null;
        setError("Couldn't start the microphone. Try again.");
        return;
      }
      setState('listening');
    } else {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError(
          Platform.OS === 'web'
            ? 'Microphone access is blocked. Allow it in your browser, then try again.'
            : 'Microphone access is off. Turn it on in Settings → Forged by Freedom, or type it instead.'
        );
        return;
      }
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      } catch (e: any) {
        setError(e?.message ?? "Couldn't start the microphone.");
        return;
      }
      setState('listening');
    }
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) setTimeout(() => stop(), 0);
        return s + 1;
      });
    }, 1000);
  }, [recorder, stop]);

  const toggle = useCallback(() => {
    if (stateRef.current === 'listening') stop();
    else if (stateRef.current === 'idle') start();
  }, [start, stop]);

  return { state, seconds, interim, error, toggle, stop, live: !!webSpeech() };
}
