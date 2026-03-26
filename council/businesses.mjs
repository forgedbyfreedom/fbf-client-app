// ============================================================
// AI R&D Council — Business Context Profiles
// ============================================================
// Each business/property gets its own context so the council
// has deep understanding of what they're advising on.
//
// Grouped by brand:
//   FBF  → forgedbyfreedom.com ecosystem
//   TAD  → tropicsafterdark.com ecosystem (includes TNT)
// ============================================================

export const BUSINESSES = {

  // ── FORGED BY FREEDOM (FBF) ─────────────────────────────────
  fbf: {
    name: 'Forged by Freedom (FBF) — Full Ecosystem',
    tagline: 'Elite fitness coaching, body recomposition & peptide therapy',
    description: `
Forged by Freedom is a premium fitness coaching company run by Bryan and Wendy Antonelli. This council session covers the ENTIRE FBF ecosystem across all properties.

**════ PROPERTIES & SITES ════**

1. **forgedbyfreedom.com** — Main marketing site & brand hub
   - Public-facing website for lead generation
   - Program info, testimonials, booking

2. **FBF Client App** (React Native + Expo, iOS/Android)
   - 7-step daily check-in (body, nutrition, activity, sleep, supplements, recommendations, notes/photos)
   - Meal plans with auto-generated shopping lists + delivery links (Instacart, Walmart, Amazon)
   - Barcode food scanner (Open Food Facts API)
   - Real-time chat between client and coach
   - Compound/peptide tracking and logging
   - Gamification (streaks, 14 badges, opt-in leaderboard)
   - Push notifications

3. **FBF Dashboard** (Next.js, fbf-dashboard.vercel.app)
   - Admin/coach web dashboard
   - Client management, program creation, check-in review
   - Coach assignment and organization management
   - Client onboarding (zero-touch: create account → upload program → send credentials)

4. **FBF API** (Node.js, forged-by-freedom repo)
   - Backend API powering dashboard and client app
   - Supabase database, Twilio SMS, push notifications
   - AI Coach integration (Claude/GPT)
   - Client data, check-ins, gamification, chat

5. **FBF Data** (Python/Node.js analytics)
   - Sports picks modeling and backtesting
   - Audio processing and content generation
   - Data analysis tools

**════ CORE OFFERINGS ════**
- 1-on-1 custom coaching programs (training, nutrition, supplementation, peptide protocols)
- FBF Recomp Protocol — proprietary body recomposition system
- Daily AI-powered check-ins with coach feedback
- Peptide consultation and protocol design (Semaglutide, BPC-157, Reta, Tesofensine, Cagrilintide, etc.)
- InBody composition tracking and blood work guidance
- Sports picks and analytics

**════ REVENUE STREAMS ════**
- Monthly coaching subscriptions
- Peptide product sales (with endo consultation)
- Custom program creation
- Supplement recommendations
- Sports picks subscriptions

**════ TECH STACK ════**
- Client App: React Native + Expo (v55), TypeScript, Supabase
- Dashboard: Next.js 14, Tailwind, Supabase
- API: Node.js, Supabase, Twilio, push notifications
- AI: Claude API, OpenAI GPT, ElevenLabs voice
- Gamification: streaks, badges, leaderboard (Supabase)
- Payments: (in progress)

**════ CURRENT FOCUS ════**
- Growing client base beyond word-of-mouth
- Scaling coaching capacity with AI assistance
- App Store presence (recently approved)
- Content marketing and social proof
- Streamlining client onboarding
- Blood work integration (planned)
- Workout template selection (planned)

**════ TARGET AUDIENCE ════**
- Men and women 25-55 looking for serious body transformation
- People interested in peptide therapy for weight loss/performance
- Gym-goers who want accountability and expert programming
- Health-conscious individuals wanting data-driven coaching
- Sports bettors looking for analytics-backed picks
    `.trim(),
    urls: [
      'https://forgedbyfreedom.com',
      'https://fbf-dashboard.vercel.app',
    ],
    competitors: [
      'Caliber', 'Future Fitness', 'Tonal coaching', 'Renaissance Periodization',
      'MacroFactor', 'Carbon Diet Coach', 'Stronger by Science', 'Jeff Nippard programs',
      'Peter Attia / Outlive coaching model',
    ],
  },

  // ── TROPICS AFTER DARK (TAD) — Full Ecosystem ──────────────
  tad: {
    name: 'Tropics After Dark (TAD) — Full Ecosystem',
    tagline: 'AI-powered travel empire — agency, portal, creator network & AI ops',
    description: `
Tropics After Dark is an AI-powered travel business run by Bryan and Wendy Antonelli. This council session covers the ENTIRE TAD ecosystem including TNT (Tropics n Trails) and all associated properties.

**════ PROPERTIES & SITES ════**

1. **tropicsafterdark.com** — Main marketing site
   - Hosted on Hostinger
   - Public-facing brand site, destinations, FAQ, contact
   - Lead generation and trip inquiry forms

2. **Tropics AI Platform** (tropics-ai-platform repo)
   - Multi-agent AI operations platform
   - Next.js 14 (App Router), Tailwind, TypeScript
   - Three sub-apps:
     • **portal.tropicsafterdark.com** — Client portal (trip details, docs, payments)
     • **admin.tropicsafterdark.com** — Staff dashboard (agent management, AI ops)
     • **api.tropicsafterdark.com** — API layer
   - AI: Anthropic Claude API, custom agent orchestration
   - Queue: BullMQ + Redis (Upstash)
   - Payments: Stripe
   - Email: Resend
   - SMS: Twilio

3. **Tropics n Trails (TNT)** — Creator & Agent Network
   - Travel agent network with AI assistants
   - Content creator partnerships
   - LinkedIn auto-posting (linkedin.com/company/tropicsntrails)
   - TNT Client App (React Native + Expo, tnt-client-app repo)

4. **Tropics Portal** (tropics-portal repo)
   - Client-facing booking and trip management portal
   - Node.js/TypeScript backend
   - Deployed on Render

5. **Tropics After Dark Desktop** (tropics-after-dark repo)
   - Electron desktop app for client management
   - Internal CRM/database tool

**════ CORE OFFERINGS ════**
- AI-powered travel booking and itinerary planning
- Travel agent network with AI assistants (TNT)
- Content creator partnerships for travel promotion
- Group trips and curated travel experiences
- Client portal for trip management, documents, payments
- Multi-agent AI operations (automated research, booking, follow-up)

**════ REVENUE STREAMS ════**
- Travel booking commissions
- Group trip packages (markup on curated experiences)
- Agent network fees / subscriptions
- Content partnerships and sponsorships
- Affiliate revenue from travel brands

**════ TECH STACK ════**
- AI Platform: Next.js 14, Supabase, Claude API, BullMQ/Redis
- Client App: React Native + Expo
- Portal: Node.js/TypeScript on Render
- Desktop: Electron + Vite
- Flight Search: Duffel API
- Payments: Stripe
- Email: Resend
- SMS: Twilio
- Social: LinkedIn API auto-posting

**════ CURRENT FOCUS ════**
- Building out the AI agent platform for autonomous operations
- Growing the travel agent network (TNT)
- Content marketing and social media presence
- Automating operations end-to-end with multi-agent AI
- Expanding group trip offerings
- Client portal UX improvements
- Scaling booking volume

**════ TARGET AUDIENCE ════**
- Couples and groups looking for curated travel experiences
- Travel agents wanting AI tools to boost productivity
- Content creators in the travel space
- People who want hassle-free, fully planned luxury trips
- Adventure travelers (trails, outdoors) + beach/resort travelers (tropics)
    `.trim(),
    urls: [
      'https://tropicsafterdark.com',
      'https://portal.tropicsafterdark.com',
      'https://admin.tropicsafterdark.com',
    ],
    competitors: [
      'Fora Travel', 'Departure Lounge', 'Virtuoso', 'TripAdvisor experiences',
      'Journy', 'Zicasso', 'Scott\'s Cheap Flights', 'Hopper', 'Kiwi.com',
    ],
  },
};
