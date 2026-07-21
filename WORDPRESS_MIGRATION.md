# WordPress Backend Migration

This branch points the app at **forgedbyfreedom.net (WordPress)** as its single
backend, replacing the Vercel dashboard + Supabase pair that was causing
intermittent failures.

## What changed in this branch

- `lib/wp-auth.ts` (new) — token login against the FBF App Bridge plugin
  (`POST /wp-json/fbf/v1/auth/login`), token stored in SecureStore, 30-day
  sliding expiry. Same account the client created at website checkout.
- `lib/api.ts` — `api.*` helpers now call
  `https://forgedbyfreedom.net/wp-json/fbf/v1` with the WP token.
  Interface is unchanged (`api.get/post/put/patch/delete/upload`).

## Server endpoints available now (FBF App Bridge plugin, live)

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/auth/login` | POST | `{email, password}` → `{token, user}` (rate-limited) |
| `/auth/logout` | POST | revokes current token |
| `/me` | GET | profile + `program` (approved program text) |
| `/client/me` | GET | legacy field names: `program_raw_text`, `workout_program`, `program_name`, `last_checkin` |
| `/checkins` | GET/POST | daily check-in: `weight, waist, water_oz, cardio_min, trained, notes` |

## Remaining app-side wiring (small, do before building)

1. **Login screen** (`app/(auth)/…`): replace the
   `supabase.auth.signInWithPassword(...)` call with:
   ```ts
   import { login } from '@/lib/wp-auth';
   const user = await login(email, password);
   ```
   and route to the tabs on success. Replace sign-out calls with
   `logout()` from the same module.
2. **Session gate** (wherever `supabase.auth.getSession()` decides
   logged-in vs logged-out): use `isLoggedIn()` from `lib/wp-auth`.
3. **Client data screens**: `api.get('/client/me')` now returns the fields
   listed above; remove any Supabase table reads.
4. Add to `.env` / EAS env: `EXPO_PUBLIC_WP_URL=https://forgedbyfreedom.net`
   (the code defaults to this URL if unset, so this is optional).
5. Signup happens on the website (checkout + intake), not in-app — the app
   login screen should link to `https://forgedbyfreedom.net/pricing` for
   new clients.

## Build

```
eas build --platform ios --profile production
```

## Why this is more reliable

One backend, one database, one login. No Vercel cold starts, no
Supabase JWT ↔ API session mismatches, no service-role key handling.
The program shown in the app is literally the text Bryan approves in the
site's Coach Queue — no sync step at all.
