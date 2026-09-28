# Job Radar

Internship and new-grad software roles at top-paying companies across **India 🇮🇳 and Singapore 🇸🇬**, with instant phone alerts. Built for a student: big tech and startups first, quant/finance/hardware one tap away.

- **210 companies tracked, 151 scanned automatically** from their real hiring systems — Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Eightfold, Oracle Recruiting, plus dedicated adapters for Google, Microsoft, Amazon, TikTok and Atlassian. Every board verified live.
- **Early-career aware.** Each role gets a level — *Intern*, *New grad*, *Open level* (no level stated) or *N+ yrs* — from the title's level marker (SDE I vs SDE II, MTS-1, Sr, Staff…), the experience the JD actually asks for, and the source's own tag where it has one (Google's "Early" filter, TikTok's "Graduate" track). The inbox defaults to Intern + New grad. Support, solutions, sales and manager roles are filtered out entirely.
- **Push alerts with zero setup.** Open the app on your phone, tap **Enable alerts**. No app, no account, no token. You're pinged only for new intern/new-grad matches.
- **Tick jobs off.** ✓ Applied / ✕ Not interested (or swipe right/left on a phone) — the role leaves your inbox, with Undo. Track OA → interview → offer in the **Tracker** tab, with notes.
- **Hiring calendar** of intern/new-grad cycles, each linked to that company's live openings.
- **Mobile-native, works on desktop.** Installable app on phones (bottom tabs, bottom sheets, swipe gestures); on desktop a three-pane layout with keyboard shortcuts: `j`/`k` move, `o` open posting, `a` applied, `x` hide, `s` save, `/` search.
- **Instant filtering** — the whole job set loads once; every filter, sort and search runs in memory.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000 — tap the refresh icon (or "Scan now") to pull live openings
npm run check        # self-checks: level/experience parsing, push encryption (RFC 8291 test vector)
```

No config needed locally — uses `data/jobs.db` (libSQL file).

## Free 24/7 deployment (~15 minutes, $0/month)

**Vercel** (hosting) + **Turso** (database) + **GitHub Actions** (scans every 30 min) + **Web Push** (alerts). All free.

### 1. Database (Turso)

```bash
# install: https://docs.turso.tech/cli/installation
turso auth signup
turso db create job-radar
turso db show job-radar --url          # → TURSO_DATABASE_URL
turso db tokens create job-radar       # → TURSO_AUTH_TOKEN
```

### 2. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo.
2. Settings → Environment Variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CRON_SECRET` (any random string, `openssl rand -hex 24`), `APP_URL` (your Vercel URL).
3. Redeploy.

### 3. Scans every 30 minutes (GitHub Actions)

Repo → Settings → Secrets and variables → Actions: add `APP_URL` (no trailing slash) and `CRON_SECRET` (same as Vercel). [.github/workflows/scan.yml](.github/workflows/scan.yml) then runs every 30 min (06:00–23:30 IST). Run it once from the Actions tab to check.

Serverless functions are capped at ~60s, so cron scans are **budgeted and resumable**: each run scans as many boards as fit in `SCAN_BUDGET_MS` (default 30s, ~100 boards), saves a cursor, and the next run continues — the full list is covered about every hour. Writes are batched (2 DB round-trips per 100 postings) and boards are fetched by a pool of 8 workers so one slow career site can't stall the rest.

### 4. Alerts on your phone

- **Android / desktop:** open your Vercel URL in Chrome → tap **Enable alerts** → Allow. You'll get a confirmation notification immediately.
- **iPhone:** Safari only allows web push for Home Screen apps — tap **Share → Add to Home Screen**, open Job Radar from the new icon, then **Enable alerts**.

Do it on every device you want pinged. The bell icon → **Send test** checks all of them. Alerts cover roles that appear *after* you enable them, never the existing backlog. Newly added companies are baselined on their first scan so they don't flood you either.

Optional extra channels, if you want them: Telegram (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) or ntfy (`NTFY_TOPIC`) — see [.env.example](.env.example).

## How it works

- `POST /api/scan` — the scan button: a complete pass over every board (~60s).
- `GET /api/cron?secret=…` — the same pipeline, budgeted and resumable, for the scheduler.
- Workday boards are filtered by each tenant's own *location facet* (discovered automatically), plus targeted `intern` / `graduate` / `university` queries so early-career roles surface even on 1000+ job boards.
- Companies with no public API (Apple, Meta, Goldman, Walmart, Uber, DE Shaw…) are in the **Companies** tab as "check manually", and in the hiring calendar so you know when checking matters.

## Tuning

- **Matching / levels:** [lib/matcher.ts](lib/matcher.ts) — `titleLevel()` (level markers), `extractMinExperience()` (JD experience asks), `NON_TECH_TITLE` (hard exclusions), scoring weights. Add a case to [scripts/check.mjs](scripts/check.mjs) when you change behaviour.
- **What ranks first:** `TIER_FOCUS` in [lib/companies.ts](lib/companies.ts); the ⭐ Focus filter is `FOCUS_TIERS` in [app/radar.tsx](app/radar.tsx). Best-match ranking also nudges a company's 2nd, 3rd… posting down so one big board can't fill the top.
- **Companies:** add to [lib/companies.ts](lib/companies.ts) — set `ats` + `atsSlug` for auto-scanning, or `ats: 'custom'` for link-only.

### Toolchain note

Pinned to **ESLint 9** and **TypeScript 5.9**: `eslint-config-next` bundles a `typescript-eslint` that rejects TS 7, and ESLint 10 breaks its `eslint-plugin-react`. Revisit once `eslint-config-next` supports them.

## Self-hosted alternative

`docker build -t job-radar . && docker run -p 3000:3000 -v ./data:/app/data job-radar` — the built-in scheduler scans every 45 min (`SCAN_INTERVAL_MINUTES`). Web Push needs HTTPS, so put it behind a TLS proxy.
