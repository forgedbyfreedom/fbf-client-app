import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Challenge, ChallengeEntry } from '../types';
import { calculateChangePct, rankEntries } from '../lib/challenge-utils';
import { useAuth } from './useAuth';

const CHALLENGES_KEY = 'fbf_challenges';
const MY_ENTRIES_KEY = 'fbf_my_entries';
const ENTRIES_KEY_PREFIX = 'fbf_challenge_entries_';

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CHALLENGES: Challenge[] = [
  {
    id: 'challenge_spring_shred',
    name: 'Spring Shred',
    description:
      '8-week body fat reduction challenge. Lose the highest percentage of body weight and win! Weekly weigh-ins required. All progress verified by coach.',
    type: 'weight_loss_pct',
    status: 'active',
    start_date: '2026-03-01',
    end_date: '2026-04-26',
    duration_weeks: 8,
    entry_fee_cents: 5000,
    prize_pool_description: 'Winner takes the pot + FBF hoodie',
    rules: [
      'Weekly weigh-ins required (photo of scale)',
      'Must check in at least 5 days per week',
      'No extreme crash diets — coach reviews plans',
      'Final weigh-in must be verified in person or via video',
      'Percentage-based ranking ensures fair competition',
    ],
    metric_label: '% Body Weight Lost',
    created_at: '2026-02-20T12:00:00Z',
    participant_count: 12,
  },
  {
    id: 'challenge_bench_battle',
    name: 'Bench Press Battle',
    description:
      '12-week strength challenge. Increase your bench press 1RM by the highest percentage. Starting and ending maxes must be verified with video.',
    type: 'strength_gain_pct',
    status: 'upcoming',
    start_date: '2026-05-01',
    end_date: '2026-07-24',
    duration_weeks: 12,
    entry_fee_cents: 2500,
    prize_pool_description: '$250 prize pool + bragging rights',
    rules: [
      'Video of starting 1RM required within first week',
      'Video of ending 1RM required in final week',
      'No bench shirts or specialty equipment',
      'Must pause at chest — no bounce reps',
      'Rankings based on % increase, not raw lbs',
    ],
    metric_label: '% Bench Press Increase',
    created_at: '2026-03-15T12:00:00Z',
    participant_count: 8,
  },
  {
    id: 'challenge_march_steps',
    name: 'March Step Madness',
    description:
      'Get moving! Accumulate the most total steps during the month of March. Sync your step tracker and let the competition begin.',
    type: 'steps',
    status: 'active',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    duration_weeks: 4,
    rules: [
      'Steps tracked via Apple Health, Garmin, or manual check-in entry',
      'Steps are cumulative for the entire month',
      'Must check in at least 4 days per week',
      'Screenshots of step data may be requested for verification',
    ],
    metric_label: 'Total Steps',
    created_at: '2026-02-25T12:00:00Z',
    participant_count: 18,
  },
];

const SEED_ENTRIES: Record<string, ChallengeEntry[]> = {
  challenge_spring_shred: [
    { id: 'e1', challenge_id: 'challenge_spring_shred', client_id: 'demo1', client_name: 'Marcus R.', baseline_value: 215, current_value: 206, change_pct: 4.19, rank: 1, verified: true, joined_at: '2026-03-01T08:00:00Z' },
    { id: 'e2', challenge_id: 'challenge_spring_shred', client_id: 'demo2', client_name: 'Sarah K.', baseline_value: 165, current_value: 159, change_pct: 3.64, rank: 2, verified: true, joined_at: '2026-03-01T09:00:00Z' },
    { id: 'e3', challenge_id: 'challenge_spring_shred', client_id: 'demo3', client_name: 'Jake T.', baseline_value: 245, current_value: 238, change_pct: 2.86, rank: 3, verified: true, joined_at: '2026-03-01T10:00:00Z' },
    { id: 'e4', challenge_id: 'challenge_spring_shred', client_id: 'demo4', client_name: 'Emily W.', baseline_value: 145, current_value: 142, change_pct: 2.07, rank: 4, verified: false, joined_at: '2026-03-02T08:00:00Z' },
    { id: 'e5', challenge_id: 'challenge_spring_shred', client_id: 'demo5', client_name: 'Chris M.', baseline_value: 198, current_value: 195, change_pct: 1.52, rank: 5, verified: true, joined_at: '2026-03-01T11:00:00Z' },
  ],
  challenge_march_steps: [
    { id: 'e6', challenge_id: 'challenge_march_steps', client_id: 'demo2', client_name: 'Sarah K.', baseline_value: 0, current_value: 312450, change_pct: 312450, rank: 1, verified: true, joined_at: '2026-03-01T06:00:00Z' },
    { id: 'e7', challenge_id: 'challenge_march_steps', client_id: 'demo1', client_name: 'Marcus R.', baseline_value: 0, current_value: 289100, change_pct: 289100, rank: 2, verified: true, joined_at: '2026-03-01T07:00:00Z' },
    { id: 'e8', challenge_id: 'challenge_march_steps', client_id: 'demo3', client_name: 'Jake T.', baseline_value: 0, current_value: 245800, change_pct: 245800, rank: 3, verified: false, joined_at: '2026-03-01T08:00:00Z' },
  ],
};

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

      // Load challenges
      let raw = await AsyncStorage.getItem(CHALLENGES_KEY);
      if (!raw) {
        await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(SEED_CHALLENGES));
        raw = JSON.stringify(SEED_CHALLENGES);
      }
      const loaded: Challenge[] = JSON.parse(raw);
      setChallenges(loaded);

      // Seed entries if empty
      for (const [cId, entries] of Object.entries(SEED_ENTRIES)) {
        const key = `${ENTRIES_KEY_PREFIX}${cId}`;
        const existing = await AsyncStorage.getItem(key);
        if (!existing) {
          await AsyncStorage.setItem(key, JSON.stringify(entries));
        }
      }

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
