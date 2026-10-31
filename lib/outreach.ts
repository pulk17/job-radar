// Outreach backend: contacts, a staggered email queue and X-ray search.
// Everything that talks to a third party is optional and enabled by an env var (see .env.example).
import nodemailer, { type Transporter } from 'nodemailer';
import { promises as dns } from 'dns';
import { execFile } from 'child_process';
import os from 'os';
import { run, getMeta, setMeta } from './db';
import { COMPANIES } from './companies';
import { EMPTY_PROFILE, xrayQuery, type Kind, type Profile } from './draft';

export class OutreachError extends Error {}

const IST_MS = 330 * 60_000;
const sql = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
const fromSql = (s: string) => new Date(s.replace(' ', 'T') + 'Z');
const cap = () => Number(process.env.OUTREACH_DAILY_CAP) || 30;

export const config = () => ({
  send: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  search: !!process.env.SERPER_API_KEY,
  cli: !!process.env.CLAUDE_CLI,
  cap: cap(),
});

// ── Profile ──
export async function getProfile(): Promise<Profile> {
  const raw = await getMeta('profile');
  return { ...EMPTY_PROFILE, ...(raw ? JSON.parse(raw) : {}) };
}
export const saveProfile = (p: Profile) => setMeta('profile', JSON.stringify(p));

// ── Contacts ──
export interface ContactRow {
  id: number; company: string; name: string; kind: Kind;
  linkedin_url: string | null; email: string | null; headline: string; last_at: string | null;
}

/** Best guess at a company's mail domain, from its careers URL. Skips ATS hosts, which say nothing. */
export function companyDomain(company: string) {
  const url = COMPANIES.find(c => c.name === company)?.careersUrl;
  if (!url) return '';
  const host = new URL(url).hostname.replace(/^(www|careers?|jobs?|apply|explore|higher)\./, '');
  return /myworkdayjobs|greenhouse|lever\.co|ashbyhq|eightfold|smartrecruiters|workable|turbohire|oraclecloud/.test(host) ? '' : host;
}

export async function listContacts(company: string): Promise<ContactRow[]> {
  const r = await run(
    `SELECT c.*, (SELECT MAX(COALESCE(o.sent_at, o.created_at)) FROM outreach o
        WHERE o.contact_id=c.id AND o.status IN ('queued','sending','sent','replied')) AS last_at
     FROM contacts c WHERE c.company=? ORDER BY c.kind, c.id DESC`, [company]);
  return r.rows as unknown as ContactRow[];
}

export async function addContact(c: { company: string; name: string; kind: Kind; linkedin_url?: string; email?: string; headline?: string }) {
  const name = c.name?.trim();
  if (!c.company || !name) throw new OutreachError('Name is required');
  const li = c.linkedin_url?.trim() ? normLinkedin(c.linkedin_url) : null;
  const email = c.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OutreachError('That email looks wrong');
  await run(
    `INSERT INTO contacts (company,name,kind,linkedin_url,email,headline) VALUES (?,?,?,?,?,?)
     ON CONFLICT(linkedin_url) DO UPDATE SET email=COALESCE(excluded.email, email)`,
    [c.company, name, c.kind, li, email, c.headline || '']);
}

export async function updateContact(id: number, email: string | null, kind?: Kind) {
  const e = email?.trim().toLowerCase() || null;
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new OutreachError('That email looks wrong');
  await run('UPDATE contacts SET email=?, kind=COALESCE(?,kind) WHERE id=?', [e, kind ?? null, id]);
}

export async function deleteContact(id: number) {
  await run('DELETE FROM contacts WHERE id=?', [id]);
  await run("DELETE FROM outreach WHERE contact_id=? AND status='queued'", [id]);
}

function normLinkedin(u: string) {
  const m = u.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (!m) throw new OutreachError('LinkedIn link should look like linkedin.com/in/name');
  return `https://www.linkedin.com/in/${m[1].toLowerCase()}`;
}

// ── History ──
export async function jobHistory(jobId: string) {
  const r = await run(
    `SELECT id, contact_id, channel, status, error, due_at, sent_at, created_at, parent_id FROM outreach WHERE job_id=? ORDER BY id`, [jobId]);
  return r.rows;
}

export async function logLinkedin(jobId: string, contactId: number, body: string) {
  await run(`INSERT INTO outreach (contact_id,job_id,channel,body,status,sent_at) VALUES (?,?,'linkedin',?, 'sent', datetime('now'))`,
    [contactId, jobId, body]);
}

/** Everything waiting on you, across roles: sent 36h+ ago, no reply, not yet followed up. */
export async function followUpsDue() {
  const r = await run(
    `SELECT o.id, o.job_id, o.sent_at, o.subject, c.name, c.company, j.title
     FROM outreach o JOIN contacts c ON c.id=o.contact_id LEFT JOIN jobs j ON j.id=o.job_id
     WHERE o.channel='email' AND o.status='sent' AND o.parent_id IS NULL AND o.sent_at<datetime('now','-36 hours')
       AND NOT EXISTS (SELECT 1 FROM outreach f WHERE f.parent_id=o.id)
     ORDER BY o.sent_at LIMIT 50`);
  return r.rows;
}

export async function setReplied(id: number, replied: boolean) {
  await run('UPDATE outreach SET status=? WHERE id=? AND status IN (\'sent\',\'replied\')', [replied ? 'replied' : 'sent', id]);
}

export async function cancelQueued(id: number) {
  await run("DELETE FROM outreach WHERE id=? AND status='queued'", [id]);
}

// ── Staggered queue ──
/** Push a time into the 9:00–18:00 IST window so nothing goes out at 3am. */
function inWindow(d: Date): Date {
  const ist = d.getTime() + IST_MS;
  const day = Math.floor(ist / 86_400_000) * 86_400_000;
  const h = (ist - day) / 3_600_000;
  if (h >= 9 && h < 18) return d;
  const start = h < 9 ? day : day + 86_400_000;
  return new Date(start + 9 * 3_600_000 + Math.random() * 300_000 - IST_MS);
}

const WAVE = 4, WAVE2_AFTER_MS = 36 * 3_600_000;

export async function queueEmails(jobId: string, items: Array<{ contact_id: number; subject: string; body: string }>) {
  if (!config().send) throw new OutreachError('Email sending isn’t set up (SMTP_USER / SMTP_PASS).');
  if (!items.length) throw new OutreachError('Pick at least one person');

  // Waterfall lock: 4 people per role, 3 more once 36h pass with the first wave unanswered.
  const used = (await run(
    `SELECT COUNT(*) n, MIN(created_at) first FROM outreach WHERE job_id=? AND channel='email' AND parent_id IS NULL AND status IN ('queued','sending','sent','replied')`, [jobId])).rows[0];
  const n = Number(used.n), allowed = n && Date.now() - fromSql(String(used.first)).getTime() > WAVE2_AFTER_MS ? WAVE + 3 : WAVE;
  if (n + items.length > allowed) throw new OutreachError(`Max ${allowed} emails per role (${n} already). ${allowed === WAVE ? 'Wave 2 unlocks 36h after the first one.' : ''}`);

  const ids = items.map(i => i.contact_id);
  const contacts = (await run(`SELECT id,name,email FROM contacts WHERE id IN (${ids.map(() => '?').join(',')})`, ids)).rows as unknown as Array<{ id: number; name: string; email: string | null }>;
  const dup = await run(`SELECT contact_id FROM outreach WHERE job_id=? AND channel='email' AND parent_id IS NULL AND status!='failed' AND contact_id IN (${ids.map(() => '?').join(',')})`, [jobId, ...ids]);
  if (dup.rows.length) throw new OutreachError('Already emailed one of these people for this role');

  // A hard-bounce hurts your sender reputation; a missing MX record is the cheap early warning.
  for (const c of contacts) {
    if (!c.email) throw new OutreachError(`${c.name} has no email`);
    try { if (!(await dns.resolveMx(c.email.split('@')[1])).length) throw 0; }
    catch { throw new OutreachError(`${c.email} can’t receive mail (no MX record)`); }
  }

  const last = (await run("SELECT MAX(due_at) t FROM outreach WHERE status='queued'")).rows[0]?.t as string | null;
  const gap = () => (6 + Math.random() * 6) * 60_000;   // 6–12 min apart
  let t = Math.max(Date.now() + 60_000, last ? fromSql(last).getTime() + gap() : 0);
  for (const it of items) {
    t = inWindow(new Date(t)).getTime();
    await run(`INSERT INTO outreach (contact_id,job_id,channel,subject,body,status,due_at) VALUES (?,?,'email',?,?,'queued',?)`,
      [it.contact_id, jobId, it.subject, it.body, sql(new Date(t))]);
    t += gap();
  }
}

export async function queueFollowUp(parentId: number, body: string) {
  const p = (await run("SELECT contact_id, job_id, subject, status FROM outreach WHERE id=?", [parentId])).rows[0];
  if (!p || p.status !== 'sent') throw new OutreachError('Only a sent, unanswered email can be followed up');
  if ((await run('SELECT 1 FROM outreach WHERE parent_id=?', [parentId])).rows.length) throw new OutreachError('Already followed up once');
  await run(`INSERT INTO outreach (contact_id,job_id,channel,subject,body,status,due_at,parent_id) VALUES (?,?,'email',?,?,'queued',?,?)`,
    [p.contact_id, p.job_id, `Re: ${p.subject}`, body, sql(inWindow(new Date(Date.now() + 60_000))), parentId]);
}

// ── Sending ──
let tx: Transporter | null = null;
const transport = () => tx ??= nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

let resume: { url: string; buf: Buffer } | null = null;
async function resumeAttachment(url: string) {
  if (!url) return undefined;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const direct = drive ? `https://drive.google.com/uc?export=download&id=${drive[1]}` : url;
  try {
    if (resume?.url !== direct) {
      const r = await fetch(direct, { signal: AbortSignal.timeout(10_000) });
      const buf = Buffer.from(await r.arrayBuffer());
      if (!r.ok || buf.length > 5_000_000 || buf.subarray(0, 4).toString() !== '%PDF') return undefined;
      resume = { url: direct, buf };
    }
    return [{ filename: 'Resume.pdf', content: resume.buf }];
  } catch { return undefined; }
}

/** Sends whatever is due, within today's cap. Safe to call from the UI poll and from cron at once. */
export async function sendDue() {
  if (!config().send) return { sent: 0, failed: 0 };
  const dayStart = Math.floor((Date.now() + IST_MS) / 86_400_000) * 86_400_000 - IST_MS;
  const today = Number((await run("SELECT COUNT(*) n FROM outreach WHERE channel='email' AND status IN ('sent','replied') AND sent_at>=?", [sql(new Date(dayStart))])).rows[0].n);
  const due = (await run(
    `SELECT o.id, o.subject, o.body, c.email, p.message_id AS thread FROM outreach o JOIN contacts c ON c.id=o.contact_id
     LEFT JOIN outreach p ON p.id=o.parent_id
     WHERE o.status='queued' AND o.channel='email' AND o.due_at<=datetime('now') ORDER BY o.due_at LIMIT ?`,
    [Math.max(0, cap() - today)])).rows as unknown as Array<{ id: number; subject: string; body: string; email: string; thread: string | null }>;
  const profile = await getProfile();
  const attachments = due.length ? await resumeAttachment(profile.resumeUrl) : undefined;
  let sent = 0, failed = 0;
  for (const o of due) {
    const claim = await run("UPDATE outreach SET status='sending' WHERE id=? AND status='queued'", [o.id]);
    if (claim.rowsAffected !== 1) continue;     // another worker took it
    try {
      const info = await transport().sendMail({
        from: `"${profile.name || process.env.SMTP_USER}" <${process.env.SMTP_USER}>`,
        to: o.email, subject: o.subject, text: o.body,
        // A follow-up stays in the original thread and doesn't re-attach the resume.
        ...(o.thread ? { inReplyTo: o.thread, references: o.thread } : { attachments }),
      });
      await run(`UPDATE outreach SET status='sent', sent_at=datetime('now'), message_id=?, error=? WHERE id=?`,
        [info.messageId || null, attachments || o.thread || !profile.resumeUrl ? null : 'sent without attachment (resume link must be a public PDF)', o.id]);
      sent++;
    } catch (e) {
      await run("UPDATE outreach SET status='failed', error=? WHERE id=?", [String(e instanceof Error ? e.message : e).slice(0, 200), o.id]);
      failed++;
    }
  }
  return { sent, failed };
}

// ── X-ray search (Serper): only the relevant LinkedIn profiles, already de-noised ──
export interface Found { name: string; headline: string; url: string }

export async function xraySearch(company: string, kind: Kind, region: string, title = ''): Promise<Found[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new OutreachError('Search isn’t set up (SERPER_API_KEY) — use “Open in Google”.');
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST', headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: xrayQuery(company, kind, region, title), num: 20, gl: region === 'singapore' ? 'sg' : 'in' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new OutreachError(`Search failed (${res.status})`);
  const organic = ((await res.json()).organic || []) as Array<{ title: string; link: string; snippet?: string }>;
  const word = company.toLowerCase().split(/\s+/)[0];
  const known = new Set((await listContacts(company)).map(c => c.linkedin_url));
  const out: Found[] = [], seen = new Set<string>();
  for (const r of organic) {
    const m = r.link.match(/linkedin\.com\/in\/([^/?#]+)/i);
    if (!m) continue;
    const url = `https://www.linkedin.com/in/${m[1].toLowerCase()}`;
    const text = `${r.title} ${r.snippet || ''}`;
    if (seen.has(url) || known.has(url)) continue;
    if (!text.toLowerCase().includes(word) || /\b(ex-|former|formerly)/i.test(text)) continue;
    const [name, ...rest] = r.title.replace(/\s*[|·]\s*LinkedIn.*$/i, '').split(/\s+[-–]\s+/);
    if (name.split(/\s+/).length > 4) continue;
    seen.add(url);
    out.push({ name: name.trim(), headline: rest.join(' · '), url });
  }
  return out;
}

// ── Claude on your own subscription ──
/**
 * One-click drafting where the Claude Code CLI is installed and logged in (your own PC),
 * set CLAUDE_CLI to its path. Everywhere else the panel's copy/paste flow does the same job.
 * All tools are off and it runs outside the repo, because the prompt carries untrusted text
 * (job descriptions, LinkedIn headlines). The API key is dropped so it can't bill the API.
 */
export function claudeCli(prompt: string): Promise<string> {
  const bin = process.env.CLAUDE_CLI;
  if (!bin) throw new OutreachError('CLAUDE_CLI isn’t set');
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  return new Promise((resolve, reject) => {
    const child = execFile(bin, ['-p', '--tools', '', '--strict-mcp-config', '--no-session-persistence'],
      { cwd: os.tmpdir(), env, timeout: 170_000, maxBuffer: 2_000_000 },
      (e, out) => e ? reject(new OutreachError(`Claude didn’t answer: ${(out || e.message).slice(0, 160)}`)) : resolve(out));
    child.stdin?.end(prompt);
  });
}
