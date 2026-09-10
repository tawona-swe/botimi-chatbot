# botimi

AI chatbot platform for businesses: train a bot on your own content (crawled pages, uploaded docs), embed it on your site as a widget, run it on WhatsApp, and manage the conversations it can't handle from a built-in support inbox.

## Stack

- **Frontend** — Next.js 16 (App Router, Turbopack), React 19, Tailwind (loaded via CDN + runtime config in `app/layout.js`, no build-step Tailwind config file)
- **Backend** — Express + better-sqlite3 (WAL mode), no ORM, no build step
- **LLM providers** — Groq, Google Gemini, OpenRouter, and OpenCode Zen, routed through a cascading fallback (`backend/src/services/modelRouter.js`) so a bot keeps responding if one provider is down or rate-limited
- **Auth** — JWT sessions (`backend/src/middleware/auth.js`), supporting both vendor-owner and invited team-member logins
- **Billing** — Pesepay (`backend/src/services/pesepay.js`, `backend/src/services/pesepayBilling.js`, `backend/src/routes/pesepay.js`): Ecocash for Zimbabwe, Visa/Mastercard (redirect flow) for international customers

## Repo layout

```
backend/    Express API, SQLite database, RAG pipeline, LLM routing, WhatsApp webhook
frontend/   Next.js dashboard, marketing pages, embeddable widget loader
```

## Getting started

Requires Node.js 18+.

```bash
# Backend
cd backend
npm install
cp .env.example .env      # fill in at least JWT_SECRET and one LLM provider key
npm run dev                # http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                # http://localhost:3000
```

The database is created automatically on first boot (`backend/data/botimi.db`) — there's no separate migration step to run for a fresh install; `migrate()` runs on every startup and is idempotent.

### Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list with descriptions. At minimum, the backend needs `JWT_SECRET` and **one** LLM provider key (Groq and Gemini both have free tiers) to serve chat responses. Everything else (Pesepay, WhatsApp, Resend email, OpenRouter, OpenCode Zen) degrades gracefully when unset — features relying on them just won't be reachable until configured.

## Core features

- **Bot builder** — crawl a website or upload documents to train a bot's knowledge base, customize its name/color/icon/welcome message, and get an embed snippet
- **Embeddable widget** (`backend/src/routes/widget.js`) — a public, CORS-open chat widget any site can embed via `<script>` tag, with optional proactive/triggered messages
- **WhatsApp channel** (`backend/src/routes/whatsapp.js`) — the same trained bot and escalation logic, reachable on a WhatsApp Business number
- **Support inbox** — tickets created when a bot escalates (low confidence or explicit handoff), with team assignment, canned responses, tags, SLA status, AI-suggested replies, conversation summaries, and post-resolution CSAT surveys
- **Team seats** — invite teammates with owner/admin/agent roles; sessions resolve back to the owning vendor account so all existing vendor-scoped data stays correctly scoped
- **Analytics** — conversation volume, ticket metrics, configurable date ranges
- **Admin** — a separate superadmin view (`components/screens/AdminPage.js`) for platform-wide oversight, distinct from the per-vendor dashboard

## Development notes

- No versioned DB migrations — `backend/src/db/schema.sql` uses `CREATE TABLE IF NOT EXISTS`, and `runColumnMigrations()` in `backend/src/db/index.js` wraps `ALTER TABLE ... ADD COLUMN` calls in try/catch for idempotency. Add new columns there, new tables directly in `schema.sql`.
- `npm run lint` in `frontend/` runs ESLint with `eslint-config-next/core-web-vitals`, which includes experimental React Compiler rules. `react-hooks/set-state-in-effect` is downgraded to a warning in `frontend/eslint.config.mjs` — see the comment there for why.
- Timestamps from SQLite (`datetime('now')`) are naive UTC strings with no timezone marker; when parsing them in JS, convert to an explicit UTC ISO string first (`ts.replace(" ", "T") + "Z"`) or `new Date()` will misinterpret them as local time.

## Not yet built

- Four onboarding screens exist (`OnboardingWizard`, `OnboardingRedesign`, `OnboardingStep2`, `OnboardingStep3`) but none are wired into the live signup flow — `register`/`login` go straight to `/dashboard` (or `/onboarding-plan` for a fresh signup). Which of the four (if any) to actually adopt is still an open decision.
- Local vs. international pricing is gated on a self-reported, unverified `country` text field — nothing stops an international customer from entering "Zimbabwe" to get the cheaper rate.
