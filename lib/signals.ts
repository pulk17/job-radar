// Signals: hiring that hasn't reached a careers page yet. Contests with PPO/PPI, funding
// rounds, YC startups hiring here, and "my team is hiring" posts. Every source is public
// and optional; one failing never blocks the rest.
import crypto from 'crypto';
import { run, runBatch, getMeta, setMeta } from './db';
import { notifySignals } from './notify';
import { isHiringPost, parseFunding, parseRss } from './signals-parse';

export type SignalKind = 'contest' | 'funding' | 'yc' | 'post';
export interface Signal { id: string; kind: SignalKind; title: string; org: string; url: string; detail: string; first_seen: string }
type New = Omit<Signal, 'first_seen'>;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const get = async (url: string) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r;
};
const hash = (s: string) => crypto.createHash('md5').update(s).digest('hex').slice(0, 16);
const day = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
const TECH = /\b(software|coding|code|hack\w*|developers?|engineers?|programming|tech|web|apps?|ai|ml|data)\b/i;
const PPO = /\b(ppos?|ppis?|pre[- ]placement)\b/i;
const HIRING = /\b(internships?|interviews?|job offers?|hiring|recruit\w*|placement)\b/i;

async function unstop(): Promise<New[]> {
  const out: New[] = [];
  for (const type of ['hiring-challenges', 'hackathons', 'competitions']) {
    const d = await (await get(`https://unstop.com/api/public/opportunity/search-result?opportunity=${type}&per_page=30&page=1&oppstatus=open`)).json() as {
      data?: { data?: Array<{ id: number; title: string; details?: string; seo_url: string; end_date?: string; organisation?: { name?: string } }> };
    };
    for (const o of d.data?.data || []) {
      const text = `${o.title} ${(o.details || '').replace(/<[^>]*>/g, ' ')}`;
      const ppo = PPO.test(text);
      if (!TECH.test(text) || (type !== 'hiring-challenges' && !ppo && !HIRING.test(text))) continue;
      out.push({
        id: `unstop:${o.id}`, kind: 'contest', title: o.title, org: o.organisation?.name || '', url: o.seo_url,
        detail: [type === 'hiring-challenges' ? 'Hiring challenge' : type === 'hackathons' ? 'Hackathon' : 'Competition', ppo && 'PPO/PPI', o.end_date && `closes ${day(o.end_date)}`].filter(Boolean).join(' · '),
      });
    }
  }
  return out;
}

async function hackerearth(): Promise<New[]> {
  const d = await (await get('https://www.hackerearth.com/chrome-extension/events/')).json() as {
    response?: Array<{ title: string; description?: string; url: string; status?: string; challenge_type?: string; date?: string }>;
  };
  return (d.response || [])
    .filter(e => /hiring/i.test(e.challenge_type || '') || PPO.test(`${e.title} ${e.description}`))
    .map(e => ({ id: `he:${hash(e.url)}`, kind: 'contest' as const, title: e.title, org: 'HackerEarth', url: e.url, detail: ['Hiring challenge', e.date].filter(Boolean).join(' · ') }));
}

const FEEDS = ['https://inc42.com/feed/', 'https://entrackr.com/rss', 'https://techcrunch.com/tag/india/feed/', 'https://www.techinasia.com/feed'];
async function funding(): Promise<New[]> {
  const out: New[] = [];
  const fresh = Date.now() - 14 * 86_400_000;
  const feeds = await Promise.allSettled(FEEDS.map(async f => parseRss(await (await get(f)).text())));
  for (const f of feeds) {
    if (f.status !== 'fulfilled') continue;
    for (const i of f.value) {
      const round = i.date >= fresh ? parseFunding(i.title) : null;
      if (round) out.push({ id: `fund:${hash(round.org.toLowerCase())}`, kind: 'funding', title: i.title, org: round.org, url: i.link, detail: round.detail });
    }
  }
  return out;
}

async function yc(): Promise<New[]> {
  const list = await (await get('https://yc-oss.github.io/api/companies/hiring.json')).json() as Array<{
    id: number; name: string; slug: string; one_liner?: string; batch?: string; status?: string; team_size?: number; regions?: string[]; all_locations?: string; nonprofit?: boolean;
  }>;
  return list
    .filter(c => c.status === 'Active' && !c.nonprofit && (c.team_size || 0) >= 3 && (c.team_size || 0) <= 500
      && /india|singapore/i.test(`${(c.regions || []).join(' ')} ${c.all_locations || ''}`))
    .map(c => ({ id: `yc:${c.id}`, kind: 'yc', title: c.name, org: c.name, url: `https://www.ycombinator.com/companies/${c.slug}/jobs`, detail: [c.batch, c.team_size && `${c.team_size} people`, c.one_liner].filter(Boolean).join(' · ') }));
}

const POST_QUERIES = [
  'site:linkedin.com/posts ("hiring" OR "looking for") ("SDE intern" OR "software intern" OR "winter intern" OR "2027 batch" OR "new grad") (Bengaluru OR Bangalore OR Hyderabad OR India OR Singapore)',
  'site:x.com ("we\'re hiring" OR "my team is hiring") ("intern" OR "new grad" OR "2027") (India OR Bengaluru OR Singapore)',
];
async function posts(): Promise<New[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  const out: New[] = [];
  for (const q of POST_QUERIES) {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST', headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, tbs: 'qdr:d', num: 20, gl: 'in' }), signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`serper ${r.status}`);
    for (const x of ((await r.json()).organic || []) as Array<{ title: string; link: string; snippet?: string }>) {
      if (!/linkedin\.com\/(posts|feed)\/|x\.com\/\w+\/status/.test(x.link) || !isHiringPost(`${x.title} ${x.snippet || ''}`)) continue;
      out.push({
        id: `post:${hash(x.link)}`, kind: 'post', title: x.title.replace(/\s*[|·-]\s*(LinkedIn|X)\s*$/i, ''),
        org: '', url: x.link, detail: x.snippet || '',
      });
    }
  }
  return out;
}

const FEEDS_EVERY = 3 * 3_600_000, POSTS_EVERY = 12 * 3_600_000;   // posts spend search credits

/** Pull whichever sources are due, store what's new and alert on what's worth a buzz. Cheap to call often. */
export async function refreshSignals() {
  const now = Date.now();
  const due = async (key: string, every: number) => {
    if (now - Number(await getMeta(key) || 0) < every) return false;
    await setMeta(key, String(now));
    return true;
  };
  const sources: Array<Promise<New[]>> = [];
  if (await due('signals_feeds_at', FEEDS_EVERY)) sources.push(unstop(), hackerearth(), funding(), yc());
  if (await due('signals_posts_at', POSTS_EVERY)) sources.push(posts());
  if (!sources.length) return { added: 0, errors: [] as string[] };

  const results = await Promise.allSettled(sources);
  const errors = results.flatMap(r => r.status === 'rejected' ? [String(r.reason)] : []);
  const found = [...new Map(results.flatMap(r => r.status === 'fulfilled' ? r.value : []).map(s => [s.id, s])).values()];

  // Same baseline rule as jobs: the very first fill doesn't buzz your phone.
  const first = Number((await run('SELECT COUNT(*) n FROM signals')).rows[0].n) === 0;
  const known = new Set((await run('SELECT id FROM signals')).rows.map(r => r.id as string));
  const fresh = found.filter(s => !known.has(s.id));
  await runBatch(fresh.map(s => ({
    sql: 'INSERT INTO signals (id,kind,title,org,url,detail) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
    args: [s.id, s.kind, s.title, s.org, s.url, s.detail],
  })));
  await run("DELETE FROM signals WHERE first_seen<datetime('now','-45 days')");
  const worthAlert = fresh.filter(s => s.kind === 'post' || s.detail.includes('PPO') || s.detail.startsWith('Hiring challenge'));
  if (!first && worthAlert.length) await notifySignals(worthAlert).catch(e => console.error('[signals] notify:', e));
  return { added: fresh.length, errors };
}

export async function listSignals(): Promise<Signal[]> {
  // Newest day first; within a day, the kinds you can act on today lead.
  const r = await run(
    `SELECT id,kind,title,org,url,detail,first_seen FROM signals WHERE dismissed=0
     ORDER BY date(first_seen) DESC, CASE kind WHEN 'post' THEN 0 WHEN 'contest' THEN 1 WHEN 'funding' THEN 2 ELSE 3 END, id LIMIT 300`);
  return r.rows as unknown as Signal[];
}

export const dismissSignal = (id: string) => run('UPDATE signals SET dismissed=1 WHERE id=?', [id]);
