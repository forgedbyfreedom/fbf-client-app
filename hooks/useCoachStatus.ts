import { useEffect, useState } from 'react';
import { coachApi } from '../lib/coach';
import { useAuth } from './useAuth';

// Shared across the tab bar and the Coach screen: one lookup per sign-in.
let cached: { user: string; isCoach: boolean } | null = null;

/** Whether the signed-in account is a coach (or Bryan), per the site. */
export function useCoachStatus() {
  const { session, user } = useAuth();
  const key = user ? String(user.id) : '';
  const [isCoach, setIsCoach] = useState(cached && cached.user === key ? cached.isCoach : false);

  useEffect(() => {
    if (!session || !key) {
      setIsCoach(false);
      return;
    }
    if (cached && cached.user === key) {
      setIsCoach(cached.isCoach);
      return;
    }
    let live = true;
    coachApi
      .me()
      .then((me) => {
        cached = { user: key, isCoach: !!me.is_coach };
        if (live) setIsCoach(!!me.is_coach);
      })
      .catch(() => {
        // Site unreachable or plugin missing: just don't show the tab.
      });
    return () => {
      live = false;
    };
  }, [session, key]);

  return isCoach;
}
