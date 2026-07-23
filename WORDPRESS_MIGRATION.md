# WordPress Single-Backend Migration — COMPLETE ✅

The app now uses **forgedbyfreedom.net (WordPress + FBF App Bridge plugin)**
as its only backend. Supabase and the Vercel fbf-dashboard API are no longer
used by the auth or client-data paths.

## Endpoints in use (`/wp-json/fbf/v1`)

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` | email+password → token + profile (same login as the website) |
| `POST /auth/logout` | revoke token |
| `GET /client/me` | profile, plan, status, approved program text |
| `GET/POST /checkins` | daily check-ins |
| `/bodyscan/*` | BodyScan (see the `bodyscan` branch) |

## Wiring status — all done

1. ✅ **Login screen** — `signIn` now goes through `providers/AuthProvider.tsx`
   → `lib/wp-auth.ts` `login()` (WP token in SecureStore, 30-day sliding TTL).
2. ✅ **Session gate** — AuthProvider bootstraps from `isLoggedIn()` /
   `getCachedUser()`; screens keep using `session` truthiness as before.
3. ✅ **Program reads** — `lib/wp-adapter.ts` fetches `/client/me` +
   `/checkins` and adapts them to the `ClientMeResponse` shape screens
   expect, including parsing the coach-approved program text into
   `WorkoutDay[]` (with a raw-text fallback so nothing is ever hidden).
4. ✅ **Env override** — `EXPO_PUBLIC_WP_URL` (defaults to
   https://forgedbyfreedom.net) in `lib/wp-auth.ts`.
5. ✅ **Signup link** — login screen points to
   https://forgedbyfreedom.net/pricing/.

## Known scope notes

- `metrics`, badges, leaderboard, chat, food-log and other Supabase-era
  features receive empty/null data from the adapter for now — screens render
  their empty states. Core flows (login, program, check-ins) are fully live.
- Streaks are computed client-side from WP check-ins.

## Ship it

```bash
npm install
npx eas build --platform ios --profile production
npx eas submit --platform ios   # then release via TestFlight
```
