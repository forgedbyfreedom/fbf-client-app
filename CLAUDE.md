# FBF Client App — Claude Code Instructions

## Core Rules
1. If you make a mistake, correct it immediately and NEVER make the same mistake twice. Learn from every error and apply that lesson across all future work in this project.
2. **CONFIDENTIAL DATA**: Wholesale peptide pricing (stored in memory as `reference_peptide_cost_sheet.md`) is restricted to Bryan Antonelli and Wendy Antonelli ONLY. NEVER expose cost/wholesale pricing in any client-facing document, code, UI, API response, commit, or shared file. This data must never appear in the codebase, logs, or any output visible to coaches, admins, or clients.
3. **No nasal peptide administration**: Never recommend or mention nasal spray delivery for any peptide (Selank, Semax, BPC-157, etc.). Always recommend SubQ injection only. Bryan does not believe in nasal bioavailability.

## Client Program Delivery Standard

When building a new client program, ALWAYS use the branded HTML/PDF template at `assets/programs/john-steadman-program.html` as the reference format. Copy and customize it for each new client.

### Required Sections (in order):
1. **Cover** — FBF logo, "Custom Coaching Program", client name, start date
2. **Client Overview** — Stats, contact info, medical conditions, training window, facility, weigh-in day
3. **Daily Targets** — Calories, protein, carbs, fats, steps, water
4. **FBF Recomp Protocol** — Recommend by default unless client goals don't fit
5. **Training Program** — Progressive overload, tables with exercise/sets/reps/rest/notes. Dumbbells/machines over barbells for pressing.
6. **Cardio Protocol** — Steps target, incline walks, optional weekend activity
7. **Meal Plan** — 5 meals with per-meal macros, daily totals, swap options, meal prep tips
8. **Weekly Shopping List** — Quantities for 7 days by category, prep day game plan, estimated cost
9. **Supplement Protocol** — Grid cards with name/dose/timing/notes
10. **Peptide Protocol** — If applicable, FBF Recomp Stack with layering schedule
11. **Compound Recommendations** — Reta, Tesofensine, Cagrilintide etc. for endo discussion (no pricing unless specified)
12. **Baseline Assessments** — Blood lab panel checklist + InBody scan instructions (free at gym)
13. **Daily Check-In** — Button + QR code linking to `fbf://checkin`
14. **Daily Temperature Check** — Full metabolic tracking explanation with reference table
15. **Footer** — Disclaimer, copyright, contact

### Branding:
- Dark theme: `#0a0a0a` background, `#FF6A00` orange accent, `#141414` surface, `#2a2a2a` borders
- Font: Inter (Google Fonts import)
- Generate both HTML and PDF via: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --print-to-pdf="output.pdf" --no-margins "input.html"`

### Delivery Checklist:
- [ ] Upload ALL program data to client profile via `PATCH /api/admin/clients/[id]` (targets, workout_program, meal_plan, cardio_protocol, current_supplements, current_peptides, medical_protocol, program_name, program_raw_text)
- [ ] Create Supabase auth account and link user_id to client record
- [ ] Verify login works end-to-end (`/api/client/me` returns full data)
- [ ] Generate HTML + PDF in `assets/programs/`
- [ ] Email PDF to client with login credentials and action items
- [ ] Client should have ZERO manual setup — everything pre-loaded

### Client Onboarding Flow:
1. Create client via `POST /api/admin/clients`
2. Create Supabase auth user via admin API (service role key)
3. Link `user_id` on client record via direct Supabase REST
4. Build program using this template
5. Upload all data via PATCH endpoint
6. Send program PDF + credentials via email
7. Optionally SMS via Twilio (`+18035906669`)

## PATCH /api/admin/clients/[id] — Accepted Fields
All client fields are updatable: first_name, last_name, email, phone, timezone, is_active, target_calories, target_protein, target_steps, target_carbs, target_fats, target_water_oz, weigh_in_day, current_supplements, current_peds, current_peptides, program_name, program_raw_text, workout_program, cardio_protocol, meal_plan, medical_protocol, sms_opt_in, instagram_handle, leaderboard_opt_in

## Check-In Flow
7 steps: Body & Wellness → Nutrition → Activity → Sleep → Supplements → Recommendations → Notes & Photos

## Twilio SMS
- Account SID and credentials stored in Vercel env vars (production)
- From number: configured in Vercel production environment
- See Vercel dashboard for credentials
