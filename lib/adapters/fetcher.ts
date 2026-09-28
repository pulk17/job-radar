import { Company, COMPANIES, TIER_FOCUS } from '../companies';
import { matchJob, MATCH_THRESHOLD, detectLanguages, type RoleType } from '../matcher';
import { upsertJobs, markInactiveJobs, recordScanResult, hasAnyJobs, markNotified, UpsertJobInput } from '../db';
import crypto from 'crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function hashId(company: string, title: string, location: string): string {
  return crypto.createHash('md5').update(`${company}::${title}::${location}`).digest('hex');
}

export interface NewJobInfo {
  company: string; title: string; location: string;
  applyUrl: string; score: number; roleType: string; region: string;
}

export interface FetchResult {
  newCount: number;
  totalCount: number;
  newJobs: NewJobInfo[];
  error?: string;
}

const EMPTY: FetchResult = { newCount: 0, totalCount: 0, newJobs: [] };

interface RawJob {
  title: string;
  location: string;
  department?: string;
  applyUrl: string;
  content?: string;
  /** The source's own career-level tag, when it has one (Google, TikTok) */
  level?: RoleType;
}

/** Run raw jobs through matching, store them in one batch, mark vanished ones inactive. */
async function ingest(company: Company, raws: RawJob[]): Promise<FetchResult> {
  const rows: UpsertJobInput[] = [];
  const info = new Map<string, NewJobInfo>();

  for (const raw of raws) {
    if (!raw.title) continue;
    const m = matchJob(raw.title, raw.location, raw.department, raw.content, TIER_FOCUS[company.tier], raw.level);
    if (m.score < MATCH_THRESHOLD) continue;

    const id = hashId(company.name, raw.title, raw.location);
    rows.push({
      id, company: company.name, tier: company.tier, title: raw.title,
      location: raw.location, department: raw.department,
      apply_url: raw.applyUrl, salary_range: company.salary, ats_platform: company.ats,
      role_type: m.roleType, languages: detectLanguages(raw.title, raw.content).join(','),
      region: m.region, matched_keywords: m.matchedKeywords.join(','),
      min_experience: m.minExperience, match_score: m.score,
    });
    info.set(id, {
      company: company.name, title: raw.title, location: raw.location,
      applyUrl: raw.applyUrl, score: m.score, roleType: m.roleType, region: m.region,
    });
  }

  // A company's first scan is a baseline: its whole existing board would
  // otherwise arrive as one giant "new jobs" alert the moment it's added.
  const firstScan = rows.length > 0 && !(await hasAnyJobs(company.name));
  const createdIds = await upsertJobs(rows);
  if (firstScan) await markNotified([...createdIds]);
  await markInactiveJobs(company.name, rows.map(r => r.id));
  const newJobs = [...createdIds].map(id => info.get(id)).filter((x): x is NewJobInfo => !!x);
  return { newCount: newJobs.length, totalCount: rows.length, newJobs };
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, 'Accept': 'application/json', ...(init?.headers || {}) },
    signal: AbortSignal.timeout(12000),  // a careers API slower than this is broken; the cron run has a serverless deadline
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Drop repeats when several queries return the same posting. */
function dedupe(raws: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return raws.filter(r => {
    const k = r.applyUrl || `${r.title}|${r.location}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Greenhouse ──
async function fetchGreenhouse(company: Company): Promise<FetchResult> {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${company.atsSlug}/jobs?content=true`) as {
    jobs?: Array<{ title?: string; location?: { name?: string }; departments?: Array<{ name?: string }>; absolute_url?: string; content?: string }>;
  };
  return ingest(company, (data.jobs || []).map(j => ({
    title: j.title || '', location: j.location?.name || '',
    department: j.departments?.[0]?.name || '',
    applyUrl: j.absolute_url || company.careersUrl, content: j.content || '',
  })));
}

// ── Lever ──
async function fetchLever(company: Company): Promise<FetchResult> {
  const jobs = await getJson(`https://api.lever.co/v0/postings/${company.atsSlug}?mode=json`) as Array<{
    text?: string; categories?: { location?: string; allLocations?: string[]; team?: string; department?: string };
    hostedUrl?: string; applyUrl?: string; descriptionPlain?: string; description?: string;
    lists?: Array<{ content?: string }>;
  }>;
  if (!Array.isArray(jobs)) throw new Error('unexpected response');
  return ingest(company, jobs.map(j => ({
    title: j.text || '',
    location: [j.categories?.location, ...(j.categories?.allLocations || [])].filter(Boolean).join(', '),
    department: j.categories?.team || j.categories?.department || '',
    applyUrl: j.hostedUrl || j.applyUrl || company.careersUrl,
    content: `${j.descriptionPlain || j.description || ''} ${(j.lists || []).map(l => l.content || '').join(' ')}`,
  })));
}

// ── Ashby ──
async function fetchAshby(company: Company): Promise<FetchResult> {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.atsSlug!)}`) as {
    jobs?: Array<{ title?: string; location?: string; secondaryLocations?: Array<{ location?: string }>;
      departmentName?: string; department?: string; jobUrl?: string; applyUrl?: string; descriptionHtml?: string }>;
  };
  return ingest(company, (data.jobs || []).map(j => ({
    title: j.title || '',
    location: [j.location, ...(j.secondaryLocations || []).map(l => l.location)].filter(Boolean).join(', '),
    department: j.departmentName || j.department || '',
    applyUrl: j.jobUrl || j.applyUrl || company.careersUrl, content: j.descriptionHtml || '',
  })));
}

// ── SmartRecruiters ──
async function fetchSmartRecruiters(company: Company): Promise<FetchResult> {
  const raws: RawJob[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${company.atsSlug}/postings?limit=100&offset=${offset}`) as {
      content?: Array<{ name?: string; location?: { city?: string; country?: string }; department?: { label?: string }; id?: string }>;
    };
    const jobs = data.content || [];
    for (const j of jobs) {
      raws.push({
        title: j.name || '',
        location: j.location?.city ? `${j.location.city}, ${j.location.country}` : j.location?.country || '',
        department: j.department?.label || '',
        applyUrl: j.id ? `https://jobs.smartrecruiters.com/${company.atsSlug}/${j.id}` : company.careersUrl,
      });
    }
    if (jobs.length < 100) break;
  }
  return ingest(company, raws);
}

// ── Workday (CXS API) — atsSlug: "tenant/wdN/site" ──
//
// Filters by the tenant's own location facet. Searching the text "India" (the
// old approach) ranks jobs that merely *mention* India — for NVIDIA only 2 of
// the first 20 hits were actually located there. Facet names and ids differ per
// tenant (locationCountry, Location_Country, locationHierarchy1, locations…),
// so they're discovered from the first response and cached per instance.
type WorkdayFacets = Record<string, string[]>;
const workdayFacetCache = new Map<string, WorkdayFacets | null>();
const REGION_PLACE = /india|bengaluru|bangalore|hyderabad|pune|mumbai|chennai|gurgaon|gurugram|noida|delhi|singapore/i;

function findRegionFacet(facets: unknown): WorkdayFacets | null {
  type F = { facetParameter?: string; descriptor?: string; id?: string; values?: F[] };
  const countries: WorkdayFacets = {};
  const places: WorkdayFacets = {};
  const walk = (fs: F[] = []) => {
    for (const f of fs) for (const v of f.values || []) {
      if (v.facetParameter) walk([v]);
      else if (!v.id || !f.facetParameter) continue;
      else if (/^(india|singapore)$/i.test((v.descriptor || '').trim())) (countries[f.facetParameter] ||= []).push(v.id);
      else if (REGION_PLACE.test(v.descriptor || '')) (places[f.facetParameter] ||= []).push(v.id);
    }
  };
  walk(facets as F[]);
  // Prefer a country-level facet; fall back to the city-level facet with the most matches.
  const pick = (m: WorkdayFacets) => Object.keys(m).sort((a, b) => m[b].length - m[a].length)[0];
  const key = pick(countries) || pick(places);
  if (!key) return null;
  return { [key]: (countries[key] || places[key]) };
}

async function fetchWorkday(company: Company): Promise<FetchResult> {
  const [tenant, wd, site] = (company.atsSlug || '').split('/');
  if (!tenant || !wd || !site) throw new Error('bad workday slug');
  const base = `https://${tenant}.${wd}.myworkdayjobs.com`;
  const search = (appliedFacets: WorkdayFacets, searchText: string, offset: number, limit = 20) =>
    getJson(`${base}/wday/cxs/${tenant}/${site}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appliedFacets, limit, offset, searchText }),
    }) as Promise<{ total?: number; facets?: unknown; jobPostings?: Array<{ title?: string; locationsText?: string; externalPath?: string }> }>;

  let facets = workdayFacetCache.get(company.atsSlug!);
  if (facets === undefined) {
    facets = findRegionFacet((await search({}, '', 0, 1)).facets);
    workdayFacetCache.set(company.atsSlug!, facets);
  }
  // No location facet (e.g. Adobe's university-only site): take the board as-is.
  const applied = facets || {};

  const raws: RawJob[] = [];
  const collect = (postings: Array<{ title?: string; locationsText?: string; externalPath?: string }>) => {
    for (const j of postings) {
      if (!j.title) continue;
      raws.push({
        title: j.title,
        // With the facet applied every hit is in India/SG; "3 Locations" says nothing, so tag it.
        location: facets && !REGION_PLACE.test(j.locationsText || '') ? `${j.locationsText || ''} (India/Singapore)` : (j.locationsText || ''),
        // externalPath is "/job/<loc>/<slug>" and the site needs all of it — stripping
        // "/job" (the old code) gave a page whose data call 422s.
        applyUrl: j.externalPath ? `${base}/en-US/${site}${j.externalPath}` : company.careersUrl,
      });
    }
  };

  // Newest-first pages of everything in-region, then targeted early-career queries
  // so internships and grad roles surface even on huge boards (Citi, Micron: 1000+).
  for (let offset = 0; offset < 60; offset += 20) {
    const d = await search(applied, '', offset);
    collect(d.jobPostings || []);
    if ((d.jobPostings || []).length < 20) break;
  }
  for (const q of ['intern', 'graduate', 'university']) collect((await search(applied, q, 0)).jobPostings || []);

  return ingest(company, dedupe(raws));
}

// ── Eightfold (*.eightfold.ai) — atsSlug: host prefix ──
async function fetchEightfold(company: Company): Promise<FetchResult> {
  const host = company.atsSlug;
  const raws: RawJob[] = [];
  for (const loc of ['India', 'Singapore']) {
    const data = await getJson(`https://${host}.eightfold.ai/api/apply/v2/jobs?num=100&location=${encodeURIComponent(loc)}&sort_by=timestamp`) as {
      positions?: Array<{ id?: number | string; name?: string; location?: string; locations?: string[]; department?: string; canonicalPositionUrl?: string }>;
    };
    for (const p of data.positions || []) {
      raws.push({
        title: p.name || '',
        location: [p.location, ...(p.locations || [])].filter(Boolean).join(', '),
        department: p.department || '',
        applyUrl: p.canonicalPositionUrl || `https://${host}.eightfold.ai/careers/job/${p.id}`,
      });
    }
  }
  return ingest(company, dedupe(raws));
}

// ── Eightfold PCSX (custom career domains) — atsSlug: "host|domain" ──
// Microsoft moved here from its old gcsservices API; Qualcomm uses the same.
async function fetchPcsx(company: Company): Promise<FetchResult> {
  const [host, domain] = (company.atsSlug || '').split('|');
  const raws: RawJob[] = [];
  const page = async (loc: string, query: string, start: number) => {
    const d = await getJson(`https://${host}/api/pcsx/search?domain=${domain}&query=${encodeURIComponent(query)}&location=${loc}&start=${start}&num=10&sort_by=timestamp`) as {
      data?: { positions?: Array<{ name?: string; locations?: string[]; department?: string; positionUrl?: string }> };
    };
    const ps = d.data?.positions || [];
    for (const p of ps) raws.push({
      title: p.name || '', location: (p.locations || []).join('; ') || loc,
      department: p.department || '', applyUrl: p.positionUrl ? `https://${host}${p.positionUrl}` : company.careersUrl,
    });
    return ps.length;
  };
  // The API returns 10 per page and rate-limits bursts (429), so keep it to six
  // calls: newest software roles plus early-career queries, lighter for Singapore.
  for (let start = 0; start < 20; start += 10) if (await page('India', 'software', start) < 10) break;
  for (const q of ['intern', 'graduate']) await page('India', q, 0);
  await page('Singapore', 'software', 0);
  await page('Singapore', 'intern', 0);
  return ingest(company, dedupe(raws));
}

// ── Oracle Recruiting Cloud — atsSlug: "host|siteNumber|locationId,locationId" ──
async function fetchOracle(company: Company): Promise<FetchResult> {
  const [host, site, locs] = (company.atsSlug || '').split('|');
  const raws: RawJob[] = [];
  for (const loc of locs.split(',')) {
    for (let offset = 0; offset < 100; offset += 25) {
      const d = await getJson(`https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${site},limit=25,offset=${offset},locationId=${loc},sortBy=POSTING_DATES_DESC`) as {
        items?: Array<{ requisitionList?: Array<{ Id?: string; Title?: string; PrimaryLocation?: string; ShortDescriptionStr?: string; secondaryLocations?: Array<{ Name?: string }> }> }>;
      };
      const reqs = d.items?.[0]?.requisitionList || [];
      for (const r of reqs) raws.push({
        title: r.Title || '',
        location: [r.PrimaryLocation, ...(r.secondaryLocations || []).map(s => s.Name)].filter(Boolean).join('; '),
        applyUrl: r.Id ? `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/job/${r.Id}` : company.careersUrl,
        content: r.ShortDescriptionStr || '',
      });
      if (reqs.length < 25) break;
    }
  }
  return ingest(company, dedupe(raws));
}

// ── Google — server-rendered careers page, already filtered to early career ──
// target_level=EARLY is Google's own new-grad bucket (it includes "Software
// Engineer II", which is L3 there), so the level comes from Google, not the title.
async function fetchGoogle(company: Company): Promise<FetchResult> {
  const raws: RawJob[] = [];
  for (let pg = 1; pg <= 5; pg++) {
    const res = await fetch(`https://www.google.com/about/careers/applications/jobs/results?location=India&location=Singapore&target_level=EARLY&target_level=INTERN_AND_APPRENTICE&page=${pg}`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const at = html.indexOf("AF_initDataCallback({key: 'ds:1'");
    if (at < 0) throw new Error('page format changed');
    const start = html.indexOf('data:', at) + 5;
    const jobs = (JSON.parse(html.slice(start, html.indexOf(', sideChannel', start))) as unknown[][])[0] as unknown[][] || [];
    for (const j of jobs) {
      const title = String(j[1] || '');
      raws.push({
        title,
        location: ((j[9] as unknown[][]) || []).map(l => l[0]).join('; '),
        applyUrl: `https://www.google.com/about/careers/applications/jobs/results/${j[0]}`,
        content: `${(j[3] as string[])?.[1] || ''} ${(j[4] as string[])?.[1] || ''}`,
        level: /\bintern|apprentice/i.test(title) ? 'intern' : 'newgrad',
      });
    }
    if (jobs.length < 20) break;
  }
  return ingest(company, dedupe(raws));
}

// ── TikTok — Singapore is its big APAC engineering hub (no India presence) ──
async function fetchTikTok(company: Company): Promise<FetchResult> {
  const raws: RawJob[] = [];
  for (const keyword of ['engineer', 'intern', 'graduate']) {
    const d = await getJson('https://api.lifeattiktok.com/api/v1/public/supplier/search/job/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'website-path': 'tiktok', Origin: 'https://lifeattiktok.com', Referer: 'https://lifeattiktok.com/' },
      body: JSON.stringify({ recruitment_id_list: [], job_category_id_list: [], subject_id_list: [], location_code_list: ['CT_163'], keyword, limit: 100, offset: 0 }),
    }) as { data?: { job_post_list?: Array<{ id?: string; title?: string; description?: string; requirement?: string; city_info?: { en_name?: string }; recruit_type?: { en_name?: string }; job_category?: { en_name?: string } }> } };
    for (const j of d.data?.job_post_list || []) {
      const rt = j.recruit_type?.en_name || '';
      raws.push({
        title: j.title || '', location: j.city_info?.en_name || 'Singapore',
        department: j.job_category?.en_name || '',
        applyUrl: `https://lifeattiktok.com/search/${j.id}`,
        content: `${j.description || ''} ${j.requirement || ''}`,
        level: /intern/i.test(rt) ? 'intern' : /grad|campus/i.test(rt) ? 'newgrad' : undefined,
      });
    }
  }
  return ingest(company, dedupe(raws));
}

// ── Amazon jobs API ──
async function fetchAmazon(company: Company): Promise<FetchResult> {
  const raws: RawJob[] = [];
  // Country + query combos; freshest first. The API caps result_limit at 100.
  const combos = [
    ['IND', 'software engineer'], ['IND', 'intern'], ['SGP', 'software engineer'],
  ];
  for (const [country, q] of combos) {
    const data = await getJson(`https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(q)}&country=${country}&result_limit=100&offset=0&sort=recent`) as {
      jobs?: Array<{ title?: string; normalized_location?: string; job_path?: string; basic_qualifications?: string; description?: string; job_category?: string }>;
    };
    for (const j of data.jobs || []) {
      raws.push({
        title: j.title || '', location: j.normalized_location || '',
        department: j.job_category || '',
        applyUrl: j.job_path ? `https://www.amazon.jobs${j.job_path}` : company.careersUrl,
        content: `${j.basic_qualifications || ''} ${j.description || ''}`,
      });
    }
  }
  return ingest(company, dedupe(raws));
}

// ── Atlassian careers API ──
async function fetchAtlassian(company: Company): Promise<FetchResult> {
  const data = await getJson('https://www.atlassian.com/endpoint/careers/listings') as Array<{
    id?: number | string; title?: string; locations?: string[]; category?: string;
    overview?: string; qualifications?: string; applyUrl?: string; portalJobPost?: { portalUrl?: string };
  }>;
  if (!Array.isArray(data)) throw new Error('unexpected response');
  return ingest(company, data.map(j => ({
    title: j.title || '',
    location: (j.locations || []).join(', '),
    department: j.category || '',
    applyUrl: j.applyUrl || j.portalJobPost?.portalUrl || `https://www.atlassian.com/company/careers/details/${j.id}`,
    content: `${j.overview || ''} ${j.qualifications || ''}`,
  })));
}

const API_ADAPTERS: Record<string, (c: Company) => Promise<FetchResult>> = {
  amazon: fetchAmazon, atlassian: fetchAtlassian, google: fetchGoogle, tiktok: fetchTikTok,
};

export async function fetchJobsForCompany(company: Company): Promise<FetchResult> {
  try {
    switch (company.ats) {
      case 'greenhouse': return await fetchGreenhouse(company);
      case 'lever': return await fetchLever(company);
      case 'ashby': return await fetchAshby(company);
      case 'smartrecruiters': return await fetchSmartRecruiters(company);
      case 'workday': return await fetchWorkday(company);
      case 'eightfold': return await fetchEightfold(company);
      case 'pcsx': return await fetchPcsx(company);
      case 'oracle': return await fetchOracle(company);
      case 'api': {
        const adapter = API_ADAPTERS[company.atsSlug || ''];
        if (!adapter) return EMPTY;
        return await adapter(company);
      }
      default: return EMPTY;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${company.ats}] ${company.name}: ${msg}`);
    return { ...EMPTY, error: msg };
  }
}

// ── Full scan runner (API route + cron) ──

export interface ScanSummary {
  scanned: number;
  newJobsFound: number;
  newJobs: NewJobInfo[];
  results: Array<{ company: string; newJobs: number; totalJobs: number; error?: string }>;
  /** Index to resume from next run; 0 once a full cycle completed */
  nextCursor: number;
  /** True when every company was covered in this run */
  complete: boolean;
  totalCompanies: number;
}

export interface ScanOptions {
  /** Stop starting new batches once this many ms have elapsed (0 = no limit) */
  budgetMs?: number;
  /** Company index to start from (for resumable/chunked scans) */
  cursor?: number;
}

export async function runFullScan(opts: ScanOptions = {}): Promise<ScanSummary> {
  const { budgetMs = 0, cursor = 0 } = opts;
  const enabled = COMPANIES.filter(c => c.enabled && c.ats !== 'custom');
  const total = enabled.length;
  const started = Date.now();
  const outOfTime = () => budgetMs > 0 && Date.now() - started > budgetMs;

  const results: ScanSummary['results'] = [];
  const allNew: NewJobInfo[] = [];

  // Start at the cursor and wrap around so every company is eventually covered.
  const ordered = [...enabled.slice(cursor % total), ...enabled.slice(0, cursor % total)];
  // A pool of workers pulling companies in order, rather than lock-step batches
  // where every batch waits on its slowest board (a 7-request Workday tenant).
  // Companies start in cursor order, so everything started is a contiguous
  // prefix and the resume cursor stays exact.
  let next = 0;
  const worker = async () => {
    while (next < ordered.length && !outOfTime()) {
      const company = ordered[next++];
      try {
        const r = await fetchJobsForCompany(company);
        await recordScanResult(company.name, r.totalCount, r.newCount, r.error);
        results.push({ company: company.name, newJobs: r.newCount, totalJobs: r.totalCount, error: r.error });
        allNew.push(...r.newJobs);
      } catch (err) {
        results.push({ company: company.name, newJobs: 0, totalJobs: 0, error: String(err) });
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const processed = next;

  const complete = processed >= total;
  return {
    scanned: results.length,
    newJobsFound: allNew.length,
    newJobs: allNew.sort((a, b) => b.score - a.score),
    results,
    nextCursor: complete ? 0 : (cursor + processed) % total,
    complete,
    totalCompanies: total,
  };
}
