# Job Radar

Personal job-hunting radar for high-paying software roles in **India 🇮🇳 and Singapore 🇸🇬** — quant/HFT, big tech, AI labs, product companies, banks, semiconductors and top startups.

- **95 companies tracked, 75+ scanned automatically** via their real ATS APIs (Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Eightfold, plus dedicated Amazon/Uber/Atlassian/Microsoft adapters). Every slug verified live.
- **Smart matching** tuned for a 0-YOE C++/TypeScript/Python profile: scores from the full JD text, extracts required years-of-experience, tags region, shows *why* each job matched.
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

That's it — [.github/workflows/scan.yml](.github/workflows/scan.yml) runs every 30 minutes (06:00–23:30 IST), scans all portals, and pushes notifications. Run it manually once from the Actions tab to verify.

### 5. Notifications

**Telegram (recommended):**
1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token → `TELEGRAM_BOT_TOKEN`.
2. Send your new bot any message.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `"chat":{"id":...}` → `TELEGRAM_CHAT_ID`.

**ntfy.sh (simplest):** install the ntfy app, subscribe to a long random topic (e.g. `pulkit-jobs-x7k2m9`), set `NTFY_TOPIC` to it.

Then click **🔔 Alerts** in the app header to send a test. The first test also baselines existing jobs so you only get alerted about genuinely new postings.

## How scanning works

- `POST /api/scan` or `GET /api/cron?secret=…` → fetches all 75+ scannable boards in parallel batches, scores each job against your profile, upserts into the DB, marks vanished postings expired, notifies about new matches, and spot-checks apply-link liveness.
- Companies without a public API (Google, Meta, Apple, Goldman, DE Shaw…) appear in the **Company Coverage** panel as "check manually" cards with direct careers links, and in the hiring calendar so you know *when* checking matters.

## Tuning the matcher

Edit [lib/matcher.ts](lib/matcher.ts): `POSITIVE_TITLE` / `POSITIVE_STACK` keyword banks, `NEGATIVE_TITLE` exclusions, YoE penalties, and `MATCH_THRESHOLD`. Add/remove companies in [lib/companies.ts](lib/companies.ts) (set `atsSlug` for auto-scanning).

## Self-hosted alternative

`docker build -t job-radar . && docker run -p 3000:3000 -v ./data:/app/data job-radar` — the built-in node-cron scheduler then scans every 45 min (`SCAN_INTERVAL_MINUTES` to change) with no external services needed.
