# Job Radar

Personal job-hunting radar for high-paying software roles in **India 🇮🇳 and Singapore 🇸🇬** — quant/HFT, big tech, AI labs, product companies, banks, semiconductors and top startups.

- **185 companies tracked, 118 scanned automatically** via their real ATS APIs (Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Eightfold, plus dedicated Amazon/Atlassian/Microsoft adapters). Every slug verified live.
- **Focused on big tech + startups** — the default "⭐ Focus" filter spans Big Tech, Startups, Product and AI; quant/banking/hardware stay tracked but rank lower. Tune it via `TIER_FOCUS` in [lib/companies.ts](lib/companies.ts).
- **Instant filtering** — the whole job set loads once and every filter, sort and search runs client-side (5–80ms, zero network round-trips).
- **Smart matching** tuned for a 0-YOE C++/TypeScript/Python profile: scores from the full JD text, extracts required years-of-experience, tags region, shows *why* each job matched.
- **Sort by best match, newest, company or title** — click a sort chip again to flip direction.
- **Push notifications** (Telegram and/or ntfy.sh — both free) whenever new matched jobs appear.
- **Application tracker**: star, status (applied/OA/interview/offer), notes, dead-link detection, CSV export.
- **Hiring calendar**: researched intern/new-grad cycles so you apply in the right window.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000 — click "Scan All"
```

No config needed locally — uses `data/jobs.db` (libSQL file). Copy `.env.example` → `.env.local` to enable notifications locally.

## Free 24/7 deployment (~15 minutes, $0/month)

The stack: **Vercel** (hosting, free) + **Turso** (database, free) + **GitHub Actions** (scans every 30 min, free) + **Telegram/ntfy** (notifications, free).

### 1. Push to GitHub

```bash
git init && git add -A && git commit -m "job radar"
# create a repo on github.com, then:
git remote add origin https://github.com/<you>/job-radar.git
git push -u origin main
```

### 2. Create the database (Turso)

```bash
# install: https://docs.turso.tech/cli/installation
turso auth signup
turso db create job-radar
turso db show job-radar --url          # → TURSO_DATABASE_URL
turso db tokens create job-radar       # → TURSO_AUTH_TOKEN
```

### 3. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo → deploy.
2. Project → Settings → Environment Variables, add:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (from step 2)
   - `CRON_SECRET` — any random string (`openssl rand -hex 24`)
   - `APP_URL` — your Vercel URL, e.g. `https://job-radar-xyz.vercel.app`
   - notification vars from step 5
3. Redeploy so the env vars take effect.

`vercel.json` already schedules a **daily** backstop scan via Vercel Cron (Hobby plan limit). The every-30-min cadence comes from GitHub Actions:

### 4. Enable the 30-minute scanner (GitHub Actions)

Repo → Settings → Secrets and variables → Actions → add:

- `APP_URL` = your Vercel URL (no trailing slash)
- `CRON_SECRET` = same value as on Vercel

That's it — [.github/workflows/scan.yml](.github/workflows/scan.yml) runs every 30 minutes (06:00–23:30 IST), scans the portals, and pushes notifications. Run it manually once from the Actions tab to verify.

**Why the workflow is reliable:** serverless hosts cap function runtime (Vercel Hobby ≈ 60s) and a full pass over 118 boards takes longer than that, which would 504. So cron scans are **budgeted and resumable** — each run scans as many boards as fit inside `SCAN_BUDGET_MS` (default 40s), saves a cursor, and the next run picks up where it left off, cycling through everything roughly hourly. The workflow itself retries up to 3 times, follows redirects, and fails loudly with a clear message on 401 (secret mismatch) or 404 (bad `APP_URL`).

### 5. Notifications

**Telegram (recommended):**
1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token → `TELEGRAM_BOT_TOKEN`.
2. Send your new bot any message.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `"chat":{"id":...}` → `TELEGRAM_CHAT_ID`.

**ntfy.sh (simplest):** install the ntfy app, subscribe to a long random topic (e.g. `pulkit-jobs-x7k2m9`), set `NTFY_TOPIC` to it.

Then click **🔔 Alerts** in the app header to send a test. The first test also baselines existing jobs so you only get alerted about genuinely new postings.

## How scanning works

- `POST /api/scan` (the **Scan All** button) → a complete pass over all 118 scannable boards in parallel batches: scores each job against your profile, upserts into the DB, marks vanished postings expired, notifies about new matches, and spot-checks apply-link liveness. Takes ~90s.
- `GET /api/cron?secret=…` → the same pipeline, but **budgeted and resumable** (see above) so it never exceeds a serverless timeout.
- Companies without a public API (Google, Meta, Apple, Goldman, DE Shaw…) appear in the **Company Coverage** panel as "check manually" cards with direct careers links, and in the hiring calendar so you know *when* checking matters.

## Tuning

- **Matching**: [lib/matcher.ts](lib/matcher.ts) — `POSITIVE_TITLE` / `POSITIVE_STACK` keyword banks, `NEGATIVE_TITLE` exclusions, YoE penalties, `MATCH_THRESHOLD`.
- **What ranks first**: `TIER_FOCUS` in [lib/companies.ts](lib/companies.ts) is added to each job's score by tier. Currently big tech and startups get `+0.12`, AI `+0.08`, product `+0.06`, quant `−0.05`, banking/hardware `−0.03`.
- **Which tiers the ⭐ Focus tab covers**: `FOCUS_TIERS` in [app/page.tsx](app/page.tsx).
- **Companies**: add to [lib/companies.ts](lib/companies.ts). Set `ats` + `atsSlug` for auto-scanning, or `ats: 'custom'` for link-only tracking.

### Toolchain note

Pinned to **ESLint 9** and **TypeScript 5.9** on purpose: `eslint-config-next` bundles a `typescript-eslint` that throws `does not support TS 7.0`, and ESLint 10 breaks its `eslint-plugin-react`. Everything else (Next 16.3, React 19.2, node-cron 4.6) is on latest. Revisit once `eslint-config-next` ships support.

## Self-hosted alternative

`docker build -t job-radar . && docker run -p 3000:3000 -v ./data:/app/data job-radar` — the built-in node-cron scheduler then scans every 45 min (`SCAN_INTERVAL_MINUTES` to change) with no external services needed.
