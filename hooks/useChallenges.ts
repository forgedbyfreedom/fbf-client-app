import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Challenge, ChallengeEntry } from '../types';
import { calculateChangePct, deriveChallengeStatus, rankEntries } from '../lib/challenge-utils';
import { useAuth } from './useAuth';

const CHALLENGES_KEY = 'fbf_challenges';
const MY_ENTRIES_KEY = 'fbf_my_entries';
const ENTRIES_KEY_PREFIX = 'fbf_challenge_entries_';

// ── Demo data cleanup ───────────────────────────────────────────────────────
// Earlier builds seeded fake challenges (Spring Shred, Bench Press Battle,
// March Step Madness) with fake participants and prize pools into device
// storage. Purge them once so real clients never see them again.

const DEMO_CHALLENGE_IDS = [
  'challenge_spring_shred',
  'challenge_bench_battle',
  'challenge_march_steps',
];
const DEMO_PURGED_KEY = 'fbf_challenges_demo_purged_v1';

async function purgeDemoData(): Promise<void> {
  if (await AsyncStorage.getItem(DEMO_PURGED_KEY)) return;

  const raw = await AsyncStorage.getItem(CHALLENGES_KEY);
  if (raw) {
    const kept = (JSON.parse(raw) as Challenge[]).filter(
      (c) => !DEMO_CHALLENGE_IDS.includes(c.id),
    );
    await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(kept));
  }

  const myRaw = await AsyncStorage.getItem(MY_ENTRIES_KEY);
  if (myRaw) {
    const kept = (JSON.parse(myRaw) as ChallengeEntry[]).filter(
      (e) => !DEMO_CHALLENGE_IDS.includes(e.challenge_id),
    );
    await AsyncStorage.setItem(MY_ENTRIES_KEY, JSON.stringify(kept));
  }

  await AsyncStorage.multiRemove(DEMO_CHALLENGE_IDS.map((id) => `${ENTRIES_KEY_PREFIX}${id}`));
  await AsyncStorage.setItem(DEMO_PURGED_KEY, new Date().toISOString());
}

/** Stored status is a stale snapshot — always recompute it from the dates. */
function withLiveStatus(list: Challenge[]): Challenge[] {
  return list.map((c) => ({ ...c, status: deriveChallengeStatus(c.start_date, c.end_date) }));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChallenges() {
  const { client } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myEntries, setMyEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId = client?.id ?? '';
  const clientName = client
    ? `${client.first_name} ${client.last_name.charAt(0)}.`
    : 'You';

  // Load from AsyncStorage, seeding if empty
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      await purgeDemoData();

      // Load challenges
      const raw = await AsyncStorage.getItem(CHALLENGES_KEY);
      const loaded: Challenge[] = raw ? JSON.parse(raw) : [];
      setChallenges(withLiveStatus(loaded));

      // Load my entries
      const myRaw = await AsyncStorage.getItem(MY_ENTRIES_KEY);
      if (myRaw) {
        setMyEntries(JSON.parse(myRaw));
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get entries for a specific challenge
  const getEntries = useCallback(async (challengeId: string): Promise<ChallengeEntry[]> => {
    try {
      const raw = await AsyncStorage.getItem(`${ENTRIES_KEY_PREFIX}${challengeId}`);
      if (!raw) return [];
      return rankEntries(JSON.parse(raw));
    } catch {
      return [];
    }
  }, []);

  // Get my entry for a specific challenge
  const getMyEntry = useCallback(
    (challengeId: string): ChallengeEntry | undefined => {
      return myEntries.find((e) => e.challenge_id === challengeId);
    },
    [myEntries],
  );

  // Join a challenge
  const joinChallenge = useCallback(
    async (challengeId: string, baselineValue: number) => {
      const newEntry: ChallengeEntry = {
        id: `entry_${Date.now()}`,
        challenge_id: challengeId,
        client_id: clientId,
        client_name: clientName,
        baseline_value: baselineValue,
        current_value: baselineValue,
        change_pct: 0,
        rank: 0,
        verified: false,
        joined_at: new Date().toISOString(),
      };

      // Add to challenge entries
      const existingRaw = await AsyncStorage.getItem(`${ENTRIES_KEY_PREFIX}${challengeId}`);
      const existing: ChallengeEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(newEntry);
      const ranked = rankEntries(existing);
      await AsyncStorage.setItem(`${ENTRIES_KEY_PREFIX}${challengeId}`, JSON.stringify(ranked));

      // Add to my entries
      const updatedMyEntries = [...myEntries, newEntry];
      setMyEntries(updatedMyEntries);
      await AsyncStorage.setItem(MY_ENTRIES_KEY, JSON.stringify(updatedMyEntries));

      // Update participant count
      const updatedChallenges = challenges.map((c) =>
        c.id === challengeId ? { ...c, participant_count: c.participant_count + 1 } : c,
      );
      setChallenges(updatedChallenges);
      await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(updatedChallenges));

      return newEntry;
    },
    [clientId, clientName, myEntries, challenges],
  );

  // Update progress for a challenge
  const updateProgress = useCallback(
    async (challengeId: string, currentValue: number) => {
      const challenge = challenges.find((c) => c.id === challengeId);
      if (!challenge) return;

      // Update in challenge entries
      const raw = await AsyncStorage.getItem(`${ENTRIES_KEY_PREFIX}${challengeId}`);
      if (!raw) return;
      let entries: ChallengeEntry[] = JSON.parse(raw);
      entries = entries.map((e) => {
        if (e.client_id === clientId) {
          const changePct = calculateChangePct(challenge.type, e.baseline_value, currentValue);
          return { ...e, current_value: currentValue, change_pct: parseFloat(changePct.toFixed(2)) };
        }
        return e;
      });
      const ranked = rankEntries(entries);
      await AsyncStorage.setItem(`${ENTRIES_KEY_PREFIX}${challengeId}`, JSON.stringify(ranked));

      // Update my entries
      const updatedMyEntries = myEntries.map((e) => {
        if (e.challenge_id === challengeId) {
          const changePct = calculateChangePct(challenge.type, e.baseline_value, currentValue);
          return { ...e, current_value: currentValue, change_pct: parseFloat(changePct.toFixed(2)) };
        }
        return e;
      });
      setMyEntries(updatedMyEntries);
      await AsyncStorage.setItem(MY_ENTRIES_KEY, JSON.stringify(updatedMyEntries));
    },
    [clientId, myEntries, challenges],
  );

  // Filtered lists
  const activeChallenges = challenges.filter((c) => c.status === 'active');
  const upcomingChallenges = challenges.filter((c) => c.status === 'upcoming');
  const completedChallenges = challenges.filter((c) => c.status === 'completed');

  return {
    challenges,
    activeChallenges,
    upcomingChallenges,
    completedChallenges,
    myEntries,
    loading,
    loadData,
    getEntries,
    getMyEntry,
    joinChallenge,
    updateProgress,
  };
}
