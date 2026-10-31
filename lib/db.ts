// Data layer on libSQL: local file in dev, Turso (free tier) in production.
// Set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to use a remote DB.
import { createClient, type Client, type InValue } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    const dbPath = path.join(process.cwd(), 'data', 'jobs.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    client = createClient({ url: `file:${dbPath}` });
  }
  return client;
}

async function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const c = getClient();
      await c.executeMultiple(`
        CREATE TABLE IF NOT EXISTS jobs (
          id              TEXT PRIMARY KEY,
          company         TEXT NOT NULL,
          tier            TEXT NOT NULL,
          title           TEXT NOT NULL,
          location        TEXT,
          department      TEXT,
          apply_url       TEXT NOT NULL,
          salary_range    TEXT,
          ats_platform    TEXT,
          role_type       TEXT DEFAULT 'fulltime',
          languages       TEXT DEFAULT '',
          region          TEXT DEFAULT 'india',
          matched_keywords TEXT DEFAULT '',
          min_experience  INTEGER,
          first_seen      TEXT DEFAULT (datetime('now')),
          last_seen       TEXT DEFAULT (datetime('now')),
          is_active       INTEGER DEFAULT 1,
          match_score     REAL DEFAULT 0,
          is_bookmarked   INTEGER DEFAULT 0,
          status          TEXT DEFAULT 'not_applied',
          notes           TEXT DEFAULT '',
          link_status     INTEGER DEFAULT 1,
          link_checked_at TEXT,
          notified_at     TEXT
        );
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT
        );
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          endpoint   TEXT PRIMARY KEY,
          p256dh     TEXT NOT NULL,
          auth       TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS scan_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company TEXT NOT NULL,
          scanned_at TEXT DEFAULT (datetime('now')),
          total_jobs INTEGER DEFAULT 0,
          new_jobs INTEGER DEFAULT 0,
          error TEXT
        );
        CREATE TABLE IF NOT EXISTS contacts (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          company      TEXT NOT NULL,
          name         TEXT NOT NULL,
          kind         TEXT DEFAULT 'sde',
          linkedin_url TEXT,
          email        TEXT,
          headline     TEXT DEFAULT '',
          created_at   TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS outreach (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_id INTEGER NOT NULL,
          job_id     TEXT NOT NULL,
          channel    TEXT NOT NULL,
          subject    TEXT DEFAULT '',
          body       TEXT NOT NULL,
          status     TEXT NOT NULL,
          error      TEXT,
          due_at     TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          sent_at    TEXT
        );
        CREATE TABLE IF NOT EXISTS signals (
          id           TEXT PRIMARY KEY,
          kind         TEXT NOT NULL,
          title        TEXT NOT NULL,
          org          TEXT DEFAULT '',
          url          TEXT NOT NULL,
          detail       TEXT DEFAULT '',
          first_seen   TEXT DEFAULT (datetime('now')),
          dismissed    INTEGER DEFAULT 0
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_li ON contacts(linkedin_url);
        CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
        CREATE INDEX IF NOT EXISTS idx_outreach_job ON outreach(job_id);
        CREATE INDEX IF NOT EXISTS idx_outreach_due ON outreach(status, due_at);
      `);
      // Migrations for DBs created by older versions (ignore duplicate-column errors).
      // Must run before index creation — indexes reference the new columns.
      for (const sql of [
        "ALTER TABLE jobs ADD COLUMN region TEXT DEFAULT 'india'",
        "ALTER TABLE jobs ADD COLUMN matched_keywords TEXT DEFAULT ''",
        'ALTER TABLE jobs ADD COLUMN min_experience INTEGER',
        'ALTER TABLE jobs ADD COLUMN notified_at TEXT',
        'ALTER TABLE scan_history ADD COLUMN error TEXT',
        "ALTER TABLE jobs ADD COLUMN batch_fit TEXT DEFAULT ''",
        'ALTER TABLE jobs ADD COLUMN reopened_at TEXT',
        'ALTER TABLE outreach ADD COLUMN message_id TEXT',
        'ALTER TABLE outreach ADD COLUMN parent_id INTEGER',
        "ALTER TABLE jobs ADD COLUMN elig TEXT DEFAULT ''",
        "ALTER TABLE jobs ADD COLUMN elig_why TEXT DEFAULT ''",
        "ALTER TABLE jobs ADD COLUMN jd TEXT DEFAULT ''",
      ]) {
        try { await c.execute(sql); } catch { /* column exists */ }
      }
      // Rows from before eligibility: the rescan may newly qualify old roles, and that's no reason to buzz a phone.
      await c.execute("UPDATE jobs SET notified_at=datetime('now') WHERE elig='' AND notified_at IS NULL");
      await c.executeMultiple(`
        CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
        CREATE INDEX IF NOT EXISTS idx_jobs_tier ON jobs(tier);
        CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);
        CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(match_score DESC);
        CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen DESC);
        CREATE INDEX IF NOT EXISTS idx_jobs_role_type ON jobs(role_type);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_region ON jobs(region);
        CREATE INDEX IF NOT EXISTS idx_scan_history_company ON scan_history(company);
      `);
    })();
  }
  return initPromise;
}

export async function run(sql: string, args: InValue[] = []) {
  await init();
  return getClient().execute({ sql, args });
}

/** One HTTP round-trip on Turso, however many statements. */
export async function runBatch(stmts: Array<{ sql: string; args: InValue[] }>) {
  if (!stmts.length) return;
  await init();
  await getClient().batch(stmts, 'write');
}

export interface JobRow {
  id: string; company: string; tier: string; title: string;
  location: string | null; department: string | null;
  apply_url: string; salary_range: string | null;
  ats_platform: string | null; role_type: string; languages: string;
  region: string; matched_keywords: string; min_experience: number | null;
  first_seen: string; last_seen: string;
  is_active: number; match_score: number; is_bookmarked: number;
  status: string; notes: string;
  link_status: number; link_checked_at: string | null;
  notified_at: string | null;
  batch_fit: string; reopened_at: string | null;
  elig: string; elig_why: string;
}

export interface UpsertJobInput {
  id: string; company: string; tier: string; title: string;
  location?: string; department?: string; apply_url: string;
  salary_range?: string; ats_platform?: string;
  role_type?: string; languages?: string;
  region?: string; matched_keywords?: string; min_experience?: number | null;
  match_score?: number; batch_fit?: string;
  elig?: string; elig_why?: string; jd?: string;
}

const UPSERT_SQL = `INSERT INTO jobs (id,company,tier,title,location,department,apply_url,salary_range,
      ats_platform,role_type,languages,region,matched_keywords,min_experience,match_score,batch_fit,elig,elig_why,jd)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       last_seen=datetime('now'), is_active=1,
       title=excluded.title, location=excluded.location, department=excluded.department,
       apply_url=excluded.apply_url, role_type=excluded.role_type, languages=excluded.languages,
       region=excluded.region, matched_keywords=excluded.matched_keywords,
       min_experience=excluded.min_experience, match_score=excluded.match_score, batch_fit=excluded.batch_fit,
       elig=excluded.elig, elig_why=excluded.elig_why, jd=excluded.jd`;

/**
 * Upsert one company's jobs and report which ids are new.
 *
 * Two round-trips per 100 jobs, not two per job. Against a local SQLite file the
 * per-job version was free; against Turso every statement is an HTTP call, so a
 * cold scan of ~20k postings meant ~40k round-trips and a serverless timeout.
 * Deliberately does not touch `status` — a job you ticked off stays ticked off.
 */
export async function upsertJobs(jobs: UpsertJobInput[]): Promise<Set<string>> {
  const created = new Set<string>();
  if (jobs.length === 0) return created;
  await init();
  const c = getClient();

  for (let i = 0; i < jobs.length; i += 100) {
    const chunk = jobs.slice(i, i + 100);
    const existing = await c.execute({
      // Gone for 3+ days then back = a reopened requisition (often a second OA wave).
      // Shorter gaps are just a board hiccup, not a signal.
      sql: `SELECT id, (is_active=0 AND last_seen<datetime('now','-3 days')) AS reopened FROM jobs WHERE id IN (${chunk.map(() => '?').join(',')})`,
      args: chunk.map(j => j.id),
    });
    const known = new Set(existing.rows.map(r => r.id as string));
    await c.batch(chunk.map(j => ({
      sql: UPSERT_SQL,
      args: [j.id, j.company, j.tier, j.title, j.location || null, j.department || null,
        j.apply_url, j.salary_range || null, j.ats_platform || null, j.role_type || 'fulltime',
        j.languages || '', j.region || 'india', j.matched_keywords || '',
        j.min_experience ?? null, j.match_score || 0, j.batch_fit || '', j.elig || '', j.elig_why || '', j.jd || ''] as InValue[],
    })), 'write');
    const reopened = existing.rows.filter(r => Number(r.reopened)).map(r => r.id as string);
    // Many at once means the board's API returned nothing for days, not that recruiters reopened them.
    if (reopened.length && reopened.length <= 5) await c.execute({
      sql: `UPDATE jobs SET reopened_at=datetime('now'), notified_at=NULL WHERE id IN (${reopened.map(() => '?').join(',')})`,
      args: reopened,
    });
    for (const j of chunk) if (!known.has(j.id)) created.add(j.id);
  }
  return created;
}

export async function markInactiveJobs(company: string, activeIds: string[]): Promise<void> {
  if (activeIds.length === 0) {
    await run('UPDATE jobs SET is_active=0 WHERE company=?', [company]);
    return;
  }
  const ph = activeIds.map(() => '?').join(',');
  await run(
    `UPDATE jobs SET is_active=0 WHERE company=? AND id NOT IN (${ph}) AND is_active=1`,
    [company, ...activeIds]
  );
}

/** A company taken off the scan list would otherwise keep its last roles active forever. */
export async function retireUnscanned(companies: string[]) {
  await run(`UPDATE jobs SET is_active=0 WHERE is_active=1 AND company NOT IN (${companies.map(() => '?').join(',')})`, companies);
}

const JOB_COLUMNS = `id,company,tier,title,location,department,apply_url,salary_range,
  ats_platform,role_type,languages,region,matched_keywords,min_experience,
  first_seen,last_seen,is_active,match_score,is_bookmarked,status,notes,
  link_status,link_checked_at,batch_fit,reopened_at,elig,elig_why`;

/**
 * Full job set for the client-side filtering cache.
 * Ships every active job plus recently-expired ones (bookmarked/tracked jobs are
 * always kept) so the client can filter instantly without refetching. Ineligible roles
 * stay stored but never ship, unless you already acted on one.
 */
export async function getAllJobs(limit = 4000, expiredWithinDays = 21): Promise<JobRow[]> {
  const res = await run(
    `SELECT ${JOB_COLUMNS} FROM jobs
     WHERE is_bookmarked=1
        OR status!='not_applied'
        OR (elig!='no' AND (is_active=1 OR last_seen > datetime('now', ?)))
     ORDER BY is_active DESC, match_score DESC, first_seen DESC
     LIMIT ?`,
    [`-${expiredWithinDays} days`, limit]
  );
  return res.rows as unknown as JobRow[];
}

export async function getStats() {
  const [total, lastScan] = await Promise.all([
    run("SELECT COUNT(*) as n FROM jobs WHERE is_active=1 AND elig!='no'"),
    run('SELECT MAX(scanned_at) as t FROM scan_history'),
  ]);
  return {
    total: Number(total.rows[0]?.n ?? 0),
    lastScan: (lastScan.rows[0]?.t as string | null) || null,
  };
}

export async function toggleBookmark(id: string) {
  await run('UPDATE jobs SET is_bookmarked=CASE WHEN is_bookmarked=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
}

export async function setStatus(id: string, status: string) {
  const valid = ['not_applied', 'applied', 'oa', 'interviewing', 'offered', 'rejected', 'not_interested'];
  if (!valid.includes(status)) return;
  await run('UPDATE jobs SET status=? WHERE id=?', [status, id]);
}

export async function setNotes(id: string, notes: string) {
  await run('UPDATE jobs SET notes=? WHERE id=?', [notes, id]);
}

export async function recordScanResult(company: string, totalJobs: number, newJobs: number, error?: string) {
  await run('INSERT INTO scan_history (company,total_jobs,new_jobs,error) VALUES (?,?,?,?)',
    [company, totalJobs, newJobs, error || null]);
}

export interface CompanyScanStatus {
  company: string;
  lastScanAt: string | null;
  lastError: string | null;
  totalJobs: number;
  lastNewJobAt: string | null;
}

export async function getCompanyScanStatus(): Promise<CompanyScanStatus[]> {
  const res = await run(`
    SELECT sh.company,
      MAX(sh.scanned_at) as lastScanAt,
      (SELECT s2.error FROM scan_history s2 WHERE s2.company=sh.company ORDER BY s2.scanned_at DESC LIMIT 1) as lastError,
      (SELECT s3.total_jobs FROM scan_history s3 WHERE s3.company=sh.company ORDER BY s3.scanned_at DESC LIMIT 1) as totalJobs,
      MAX(CASE WHEN sh.new_jobs>0 THEN sh.scanned_at ELSE NULL END) as lastNewJobAt
    FROM scan_history sh GROUP BY sh.company
  `);
  return res.rows as unknown as CompanyScanStatus[];
}

export async function getMeta(key: string): Promise<string | null> {
  const res = await run('SELECT value FROM meta WHERE key=?', [key]);
  return (res.rows[0]?.value as string | undefined) ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run(
    'INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value]
  );
}

export async function getLinksToCheck(limit = 50): Promise<Array<{ id: string; apply_url: string }>> {
  const res = await run(
    `SELECT id,apply_url FROM jobs
     WHERE is_active=1 AND elig!='no' AND (link_checked_at IS NULL OR link_checked_at<datetime('now','-1 day'))
     ORDER BY link_checked_at ASC NULLS FIRST LIMIT ?`, [limit]);
  return res.rows as unknown as Array<{ id: string; apply_url: string }>;
}

export async function updateLinkStatus(id: string, status: number) {
  await run("UPDATE jobs SET link_status=?,link_checked_at=datetime('now') WHERE id=?", [status, id]);
}

export async function getAvailableLanguages() {
  const res = await run("SELECT languages FROM jobs WHERE is_active=1 AND elig!='no' AND languages!=''");
  const counts: Record<string, number> = {};
  for (const row of res.rows as unknown as Array<{ languages: string }>) {
    for (const lang of row.languages.split(',')) {
      const l = lang.trim(); if (l) counts[l] = (counts[l] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([language, count]) => ({ language, count })).sort((a, b) => b.count - a.count);
}

/**
 * New jobs worth an alert: active, not ticked off, and clearly eligible. */
export async function getUnnotifiedJobs(minScore = 0.3, limit = 25): Promise<JobRow[]> {
  const res = await run(
    `SELECT ${JOB_COLUMNS} FROM jobs
     WHERE notified_at IS NULL AND is_active=1 AND status='not_applied'
       AND elig='yes' AND match_score>=?
     ORDER BY match_score DESC LIMIT ?`, [minScore, limit]);
  return res.rows as unknown as JobRow[];
}

export async function markNotified(ids: string[]) {
  if (ids.length === 0) return;
  const ph = ids.map(() => '?').join(',');
  await run(`UPDATE jobs SET notified_at=datetime('now') WHERE id IN (${ph})`, ids);
}

/** Suppress notifications for jobs that existed before notifications were enabled */
export async function markAllNotified() {
  await run("UPDATE jobs SET notified_at=datetime('now') WHERE notified_at IS NULL");
}

export async function exportJobsCsv(): Promise<string> {
  const res = await run(
    `SELECT company,tier,title,location,region,department,role_type,languages,matched_keywords,
      min_experience,salary_range,match_score,status,notes,apply_url,first_seen,is_active
     FROM jobs ORDER BY match_score DESC`);
  const jobs = res.rows as unknown as Array<Record<string, unknown>>;
  if (jobs.length === 0) return '';
  const headers = Object.keys(jobs[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...jobs.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

/** JDs already fetched, so a title-only board costs one extra request per posting, once. */
export async function getStoredJds(company: string): Promise<Map<string, string>> {
  const res = await run("SELECT id,jd FROM jobs WHERE company=? AND jd!=''", [company]);
  return new Map(res.rows.map(r => [r.id as string, r.jd as string]));
}

export async function getJd(id: string): Promise<string> {
  return ((await run('SELECT jd FROM jobs WHERE id=?', [id])).rows[0]?.jd as string | undefined) || '';
}

export async function hasAnyJobs(company: string): Promise<boolean> {
  const res = await run('SELECT 1 FROM jobs WHERE company=? LIMIT 1', [company]);
  return res.rows.length > 0;
}

/** Store a value only if the key is unset; returns whatever ends up stored (first writer wins). */
export async function getOrSetMeta(key: string, make: () => string): Promise<string> {
  await run('INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING', [key, make()]);
  return (await getMeta(key))!;
}

export interface PushSubscriptionRow { endpoint: string; p256dh: string; auth: string; }

export async function savePushSubscription(sub: PushSubscriptionRow) {
  await run(
    `INSERT INTO push_subscriptions (endpoint,p256dh,auth) VALUES (?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth`,
    [sub.endpoint, sub.p256dh, sub.auth]);
}

export async function deletePushSubscription(endpoint: string) {
  await run('DELETE FROM push_subscriptions WHERE endpoint=?', [endpoint]);
}

export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const res = await run('SELECT endpoint,p256dh,auth FROM push_subscriptions');
  return res.rows as unknown as PushSubscriptionRow[];
}
