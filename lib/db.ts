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
        CREATE TABLE IF NOT EXISTS scan_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company TEXT NOT NULL,
          scanned_at TEXT DEFAULT (datetime('now')),
          total_jobs INTEGER DEFAULT 0,
          new_jobs INTEGER DEFAULT 0,
          error TEXT
        );
      `);
      // Migrations for DBs created by older versions (ignore duplicate-column errors).
      // Must run before index creation — indexes reference the new columns.
      for (const sql of [
        "ALTER TABLE jobs ADD COLUMN region TEXT DEFAULT 'india'",
        "ALTER TABLE jobs ADD COLUMN matched_keywords TEXT DEFAULT ''",
        'ALTER TABLE jobs ADD COLUMN min_experience INTEGER',
        'ALTER TABLE jobs ADD COLUMN notified_at TEXT',
        'ALTER TABLE scan_history ADD COLUMN error TEXT',
      ]) {
        try { await c.execute(sql); } catch { /* column exists */ }
      }
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

async function run(sql: string, args: InValue[] = []) {
  await init();
  return getClient().execute({ sql, args });
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
}

export interface UpsertJobInput {
  id: string; company: string; tier: string; title: string;
  location?: string; department?: string; apply_url: string;
  salary_range?: string; ats_platform?: string;
  role_type?: string; languages?: string;
  region?: string; matched_keywords?: string; min_experience?: number | null;
  match_score?: number;
}

/** Returns true if the job is new */
export async function upsertJob(job: UpsertJobInput): Promise<boolean> {
  const existing = await run('SELECT id FROM jobs WHERE id = ?', [job.id]);
  if (existing.rows.length > 0) {
    await run(
      `UPDATE jobs SET last_seen=datetime('now'), is_active=1,
        title=?, location=?, department=?, apply_url=?,
        role_type=?, languages=?, region=?, matched_keywords=?, min_experience=?, match_score=?
       WHERE id=?`,
      [job.title, job.location || null, job.department || null, job.apply_url,
       job.role_type || 'fulltime', job.languages || '', job.region || 'india',
       job.matched_keywords || '', job.min_experience ?? null, job.match_score || 0, job.id]
    );
    return false;
  }
  await run(
    `INSERT INTO jobs (id,company,tier,title,location,department,apply_url,salary_range,
      ats_platform,role_type,languages,region,matched_keywords,min_experience,match_score)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [job.id, job.company, job.tier, job.title, job.location || null,
     job.department || null, job.apply_url, job.salary_range || null,
     job.ats_platform || null, job.role_type || 'fulltime', job.languages || '',
     job.region || 'india', job.matched_keywords || '', job.min_experience ?? null,
     job.match_score || 0]
  );
  return true;
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

export interface JobFilters {
  tier?: string; search?: string; active?: boolean;
  bookmarked?: boolean; statusFilter?: string;
  roleType?: string; languages?: string[]; region?: string;
  sort?: string; order?: string;
}

export async function getJobs(filters: JobFilters): Promise<JobRow[]> {
  const conds: string[] = [];
  const params: InValue[] = [];

  if (filters.tier && filters.tier !== 'all') { conds.push('tier=?'); params.push(filters.tier); }
  if (filters.search) {
    conds.push('(title LIKE ? OR company LIKE ? OR location LIKE ? OR notes LIKE ?)');
    const s = `%${filters.search}%`; params.push(s, s, s, s);
  }
  if (filters.active !== undefined) { conds.push('is_active=?'); params.push(filters.active ? 1 : 0); }
  if (filters.bookmarked) conds.push('is_bookmarked=1');
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    if (filters.statusFilter === 'applied_any') conds.push("status != 'not_applied'");
    else { conds.push('status=?'); params.push(filters.statusFilter); }
  }
  if (filters.roleType && filters.roleType !== 'all') { conds.push('role_type=?'); params.push(filters.roleType); }
  if (filters.region && filters.region !== 'all') { conds.push('region=?'); params.push(filters.region); }
  if (filters.languages && filters.languages.length > 0) {
    conds.push(`(${filters.languages.map(() => 'languages LIKE ?').join(' OR ')})`);
    for (const l of filters.languages) params.push(`%${l}%`);
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const validSorts: Record<string, string> = {
    score: 'match_score', date: 'first_seen', company: 'company', title: 'title', salary: 'salary_range',
  };
  const sortCol = validSorts[filters.sort || ''] || 'match_score';
  const sortDir = filters.order === 'asc' ? 'ASC' : 'DESC';
  const res = await run(
    `SELECT * FROM jobs ${where} ORDER BY ${sortCol} ${sortDir}, first_seen DESC LIMIT 1000`,
    params
  );
  return res.rows as unknown as JobRow[];
}

export async function getStats() {
  const q = async (sql: string) => Number((await run(sql)).rows[0]?.c ?? 0);
  const lastScanRes = await run('SELECT MAX(scanned_at) as t FROM scan_history');
  return {
    active: await q('SELECT COUNT(*) as c FROM jobs WHERE is_active=1'),
    total: await q('SELECT COUNT(*) as c FROM jobs'),
    bookmarked: await q('SELECT COUNT(*) as c FROM jobs WHERE is_bookmarked=1'),
    applied: await q("SELECT COUNT(*) as c FROM jobs WHERE status!='not_applied'"),
    newToday: await q("SELECT COUNT(*) as c FROM jobs WHERE date(first_seen)=date('now')"),
    deadLinks: await q('SELECT COUNT(*) as c FROM jobs WHERE link_status=0 AND is_active=1'),
    interns: await q("SELECT COUNT(*) as c FROM jobs WHERE role_type='intern' AND is_active=1"),
    newgrad: await q("SELECT COUNT(*) as c FROM jobs WHERE role_type='newgrad' AND is_active=1"),
    india: await q("SELECT COUNT(*) as c FROM jobs WHERE region='india' AND is_active=1"),
    singapore: await q("SELECT COUNT(*) as c FROM jobs WHERE region='singapore' AND is_active=1"),
    lastScan: (lastScanRes.rows[0]?.t as string | null) || null,
  };
}

export async function toggleBookmark(id: string) {
  await run('UPDATE jobs SET is_bookmarked=CASE WHEN is_bookmarked=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
}

export async function setStatus(id: string, status: string) {
  const valid = ['not_applied', 'applied', 'oa', 'interviewing', 'offered', 'rejected'];
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

export async function getLinksToCheck(limit = 50): Promise<Array<{ id: string; apply_url: string }>> {
  const res = await run(
    `SELECT id,apply_url FROM jobs
     WHERE is_active=1 AND (link_checked_at IS NULL OR link_checked_at<datetime('now','-1 day'))
     ORDER BY link_checked_at ASC NULLS FIRST LIMIT ?`, [limit]);
  return res.rows as unknown as Array<{ id: string; apply_url: string }>;
}

export async function updateLinkStatus(id: string, status: number) {
  await run("UPDATE jobs SET link_status=?,link_checked_at=datetime('now') WHERE id=?", [status, id]);
}

export async function getAvailableLanguages() {
  const res = await run("SELECT languages FROM jobs WHERE is_active=1 AND languages!=''");
  const counts: Record<string, number> = {};
  for (const row of res.rows as unknown as Array<{ languages: string }>) {
    for (const lang of row.languages.split(',')) {
      const l = lang.trim(); if (l) counts[l] = (counts[l] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([language, count]) => ({ language, count })).sort((a, b) => b.count - a.count);
}

/** New active jobs that have not been notified yet (for Telegram/ntfy alerts) */
export async function getUnnotifiedJobs(minScore = 0.3, limit = 25): Promise<JobRow[]> {
  const res = await run(
    `SELECT * FROM jobs WHERE notified_at IS NULL AND is_active=1 AND match_score>=?
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
