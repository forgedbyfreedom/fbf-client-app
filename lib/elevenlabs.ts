import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const TTS_PROXY = 'https://forged-by-freedom-api-nm4f.onrender.com/tts';

export async function generateSpeech(
  text: string,
  voiceId?: string
): Promise<string> {
  const res = await fetch(TTS_PROXY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      ...(voiceId ? { voice_id: voiceId } : {}),
    }),
  });

  if (!res.ok) throw new Error(`TTS error ${res.status}: ${await res.text()}`);

  const blob = await res.blob();
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function playAudio(dataUri: string): Promise<AudioPlayer> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
  });
  const player = createAudioPlayer(dataUri);
  player.play();
  return player;
}
