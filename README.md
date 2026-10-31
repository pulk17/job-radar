# Job Radar

Internship and new-grad software roles at top-paying companies across **India 🇮🇳 and Singapore 🇸🇬**, filtered to what a 0-experience 2027 graduate can actually apply to, with instant phone alerts.

- **213 companies tracked, 165 scanned automatically** from their real hiring systems — Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Eightfold, Oracle Recruiting, Rippling, Jobvite, TalentBrew, plus dedicated adapters for Google, Microsoft, Amazon, TikTok and Atlassian. Every board verified live.
- **Strict eligibility.** Only roles asking 0 or 0–n years, for your batch, are shown, each with the evidence ("JD asks 0-2 yrs"). The call reads the real job description: boards that list titles only get each JD fetched once. Roles that state nothing either way sit in a separate **Unclear** tab, and experienced or other-batch roles never appear. Support, solutions, sales and manager roles are filtered out entirely.
- **Push alerts with zero setup.** Open the app on your phone, tap **Enable alerts**. No app, no account, no token. You're pinged only for clearly eligible roles.
- **One flow.** **Today** shows follow-ups due, your shortlist and what's new. **Roles** is everything eligible. ☆ shortlists (swipe right), ✕ hides (swipe left). **Reach out**, then **Apply**, and the app asks whether you applied. **Pipeline** tracks shortlist → applied → OA → interview → offer, with notes. **Radar** holds signals, the hiring calendar and companies.
- **Mobile-native, works on desktop.** Installable app on phones (bottom tabs, bottom sheets, swipe gestures); on desktop a three-pane layout with keyboard shortcuts: `j`/`k` move, `s` shortlist, `r` reach out, `o` open posting, `a` applied, `x` hide, `/` search.
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

### 5. Reach out (referrals + cold email)

Open any role → **Reach out to people** (or press `r`). Everything is optional and switches on with an env var, see [.env.example](.env.example):

- **Find people** — one-tap Google X-ray links per role (engineers / managers / recruiters, plus your college's alumni once your details are saved). Paste any number of LinkedIn links back and they're added, names included. With `SERPER_API_KEY`, matching profiles are listed in-app instead. Your LinkedIn account is never automated.
- **Drafts** — instant templates from your saved details, or **Write with Claude** on your Pro plan with no API key: one tap copies a prompt covering everyone you've added, with the JD, and opens claude.ai. Paste the reply back and every draft fills in. On your own PC, `CLAUDE_CLI` adds a one-click button. A 300-char LinkedIn note is included for each person.
- **Send** — with `SMTP_USER` + `SMTP_PASS` (Gmail app password) emails go out as plain text with your resume PDF attached, 6–12 min apart, 9am–6pm IST, capped per day. Max 4 people per role, 3 more after 36h. Addresses with no MX record are refused.
- **Lock** — set `OUTREACH_KEY` (required in production) and enter it once in the panel.
- **Emails** — one real address at a company teaches its format, so the next person there gets a one-tap suggestion. Otherwise suggestions are labelled as unverified guesses.
- **Follow-ups** — one follow-up per person, in the same Gmail thread, offered 36h after a mail with no reply. Everything due shows at the top of **Today**.

### 6. Signals

**Radar → Signals** is hiring that hasn't reached a careers page: open contests with hiring or PPO/PPI (Unstop, HackerEarth), funding rounds from the last 14 days (Inc42, Entrackr, TechCrunch India, Tech in Asia), YC startups hiring in India or Singapore, and, with `SERPER_API_KEY`, "my team is hiring" posts from the last 24 hours. Funded and YC cards have **Reach out**, which drafts a cold note with no invented role. Feeds refresh every 3 hours and hiring posts every 12 (they use search credits). Only hiring posts and PPO/hiring contests send an alert.

Jobs also carry two signals of their own: **Your batch** when the description names `TARGET_BATCH` (default 2027), which qualifies generic titles like "Software Engineer", and **Reopened** when a posting that was gone for 3+ days comes back, which alerts you again.

## How it works

- `POST /api/scan` — the scan button: a complete pass over every board (~60s).
- `GET /api/cron?secret=…` — the same pipeline, budgeted and resumable, for the scheduler.
- Workday boards are filtered by each tenant's own *location facet* (discovered automatically), plus targeted `intern` / `graduate` / `university` queries so early-career roles surface even on 1000+ job boards.
- Companies with no public API (Apple, Meta, Goldman, Walmart, Uber, DE Shaw…) are under **Radar → Companies** as "check manually", and in the hiring calendar so you know when checking matters.

## Tuning

- **Matching / levels:** [lib/matcher.ts](lib/matcher.ts) — `judge()` (the eligibility rules), `titleLevel()` (level markers), `extractMinExperience()` (JD experience asks), `NON_TECH_TITLE` (hard exclusions), scoring weights. Add a case to [scripts/check.mjs](scripts/check.mjs) when you change behaviour.
- **What ranks first:** `TIER_FOCUS` in [lib/companies.ts](lib/companies.ts); the ⭐ Focus filter is `FOCUS_TIERS` in [app/radar.tsx](app/radar.tsx). Best-match ranking also nudges a company's 2nd, 3rd… posting down so one big board can't fill the top.
- **Companies:** add to [lib/companies.ts](lib/companies.ts) — set `ats` + `atsSlug` for auto-scanning, or `ats: 'custom'` for link-only.

### Toolchain note

Pinned to **ESLint 9** and **TypeScript 5.9**: `eslint-config-next` bundles a `typescript-eslint` that rejects TS 7, and ESLint 10 breaks its `eslint-plugin-react`. Revisit once `eslint-config-next` supports them.

## Self-hosted alternative

`docker build -t job-radar . && docker run -p 3000:3000 -v ./data:/app/data job-radar` — the built-in scheduler scans every 45 min (`SCAN_INTERVAL_MINUTES`). Web Push needs HTTPS, so put it behind a TLS proxy.
