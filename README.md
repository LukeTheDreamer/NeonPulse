Project Overview:
This project is a web-based game portal where users can play browser games instantly.
Games run fully in the browser using HTML5 / Canvas / WebGL.
The focus is performance, simplicity, and sustainable monetization.
This is NOT an AI-based project.

Frontend:
- HTML, CSS, and vanilla JavaScript
- Static-first approach (pages are static files served by CDN)
- JavaScript fetches dynamic data after page load
- Mobile-friendly and fast loading
- Games embedded directly on individual pages

Hosting & Backend:
- Hosted on Netlify
- Backend logic handled via Netlify Functions
- Database: Neon (PostgreSQL)

Architecture Rules:
- Never expose database credentials in frontend code
- All database access must go through Netlify Functions
- Secrets stored in Netlify environment variables
- Backend is used only for dynamic data (scores, auth, purchases)
- Functions should be small and focused

Authentication:
- Passwordless authentication (email magic links / OTP)
- No passwords are stored or handled
- Auth provides a stable user_id and verified email
- Login required only for leaderboards, purchases, and premium features
- Guest play is allowed

Database Usage (Neon):
The database stores:
- Users (user_id, email)
- Games metadata
- Scores and leaderboards
- Purchases and subscriptions
- Cosmetic unlocks

Indexes should exist on:
- user_id
- game_id
- created_at

Core Features:
- Homepage with game grid
- Individual playable game pages
- Leaderboards per game
- Minimal user profiles
- Score submission API
- Mobile support

Monetization Strategy:
1. Ads
   - Primary revenue source at launch
   - Banner and interstitial ads

2. Microtransactions
   - Cosmetic-only items (skins, themes, effects)
   - No pay-to-win mechanics
   - Payments handled via Stripe
   - Purchases linked to user_id in Neon

3. Premium / Subscription (future)
   - Ad-free experience
   - Saved progress
   - Cosmetic bonuses

Payments:
- Stripe is used for payments and microtransactions
- Stripe webhooks trigger Netlify Functions
- Functions update Neon after verified payments
- Frontend checks unlocks via API
- Payments and unlocks must never be client-trusted

Production setup (Payments & DB) ✅
- Add required env vars (see `.env.example`) to your environment or Netlify site settings.
- Run `npm install` to install dependencies (`stripe`, `@netlify/neon`, etc.).
- Provision Netlify DB (Netlify):
  - Run `npx netlify db init` (requires `netlify login`) to create the database and set `NETLIFY_DATABASE_URL`.
- Initialize tables (local/dev/Netlify):
  - Set `INIT_DB_TOKEN` in your env to a secret value.
  - POST an empty request to `/.netlify/functions/init_db` with header `Authorization: Bearer <INIT_DB_TOKEN>` to create tables (scores, users, payments).
- Start Netlify locally for smoke tests: `npx netlify dev` (it will serve functions locally).
- To test webhooks locally: use `stripe listen --forward-to localhost:8888/.netlify/functions/stripe_webhook` and ensure `STRIPE_WEBHOOK_SECRET` is set from `stripe listen` output.

Security / hardening notes:
- Webhook processing is idempotent (uses `payments.stripe_session_id` unique constraint).
- Store purchases require valid Auth0 JWT tokens and are recorded server-side.
- Make sure you do NOT commit `.env` to Git — we provide `.env.example`.


Cheating & Anti-Cheat Policy:
- Client-side games are considered untrusted
- Assume scores can be manipulated
- Monetization and purchases must be server-verified
- Score submissions are validated server-side for reasonable limits
- Reject or flag impossible scores (time vs score checks)
- Rate-limit score submissions
- Prefer soft validation and filtering over hard blocking
- Leaderboards should tolerate minor cheating but block obvious abuse
- Protect payments and unlocks 100%

Development Guidelines:
- Favor clarity over complexity
- Build features incrementally
- Optimize for performance and reliability
- Assume scale, avoid premature optimization

Long-Term Vision:
Grow into a scalable web game portal with strong retention,
competitive leaderboards, and sustainable monetization.
