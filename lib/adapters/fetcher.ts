import { Company, COMPANIES } from '../companies';
import { matchJob, MATCH_THRESHOLD, classifyRoleType, detectLanguages } from '../matcher';
import { upsertJob, markInactiveJobs, recordScanResult } from '../db';
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
}

/** Match, score and store one job. Returns id + isNew if it passed the filter. */
async function processJob(company: Company, raw: RawJob): Promise<{ id: string; isNew: boolean; info: NewJobInfo } | null> {
  const m = matchJob(raw.title, raw.location, raw.department, raw.content);
  if (m.score < MATCH_THRESHOLD) return null;

  const roleType = classifyRoleType(raw.title);
  const languages = detectLanguages(raw.title, raw.content);
  const id = hashId(company.name, raw.title, raw.location);
  const isNew = await upsertJob({
    id, company: company.name, tier: company.tier, title: raw.title,
    location: raw.location, department: raw.department,
    apply_url: raw.applyUrl, salary_range: company.salary, ats_platform: company.ats,
    role_type: roleType, languages: languages.join(','),
    region: m.region, matched_keywords: m.matchedKeywords.join(','),
    min_experience: m.minExperience, match_score: m.score,
  });
  return {
    id, isNew,
    info: { company: company.name, title: raw.title, location: raw.location, applyUrl: raw.applyUrl, score: m.score, roleType, region: m.region },
  };
}

/** Run raw jobs through matching/storage and mark vanished ones inactive. */
async function ingest(company: Company, raws: RawJob[]): Promise<FetchResult> {
  const activeIds: string[] = [];
  const newJobs: NewJobInfo[] = [];
  for (const raw of raws) {
    if (!raw.title) continue;
    const r = await processJob(company, raw);
    if (r) { activeIds.push(r.id); if (r.isNew) newJobs.push(r.info); }
  }
  await markInactiveJobs(company.name, activeIds);
  return { newCount: newJobs.length, totalCount: activeIds.length, newJobs };
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, 'Accept': 'application/json', ...(init?.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
      totalFound?: number;
      content?: Array<{ name?: string; location?: { city?: string; country?: string }; department?: { label?: string }; id?: string; ref?: string; company?: { identifier?: string } }>;
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
async function fetchWorkday(company: Company): Promise<FetchResult> {
  const [tenant, wd, site] = (company.atsSlug || '').split('/');
  if (!tenant || !wd || !site) throw new Error('bad workday slug');
  const base = `https://${tenant}.${wd}.myworkdayjobs.com`;
  const seen = new Set<string>();
  const raws: RawJob[] = [];

  for (const searchText of ['India', 'Singapore']) {
    for (let offset = 0; offset < 100; offset += 20) {
      const data = await getJson(`${base}/wday/cxs/${tenant}/${site}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText }),
      }) as { total?: number; jobPostings?: Array<{ title?: string; locationsText?: string; externalPath?: string; bulletFields?: string[] }> };
      const postings = data.jobPostings || [];
      for (const j of postings) {
        const key = j.externalPath || `${j.title}|${j.locationsText}`;
        if (seen.has(key)) continue;
        seen.add(key);
        raws.push({
          title: j.title || j.bulletFields?.[0] || '',
          location: j.locationsText || '',
          applyUrl: j.externalPath ? `${base}/en-US/${site}${j.externalPath.replace(/^\/[^/]+/, '')}` : company.careersUrl,
        });
      }
      if (postings.length < 20 || (data.total !== undefined && offset + 20 >= Math.min(data.total, 100))) break;
    }
  }
  return ingest(company, raws);
}

// ── Eightfold — atsSlug: host prefix ──
async function fetchEightfold(company: Company): Promise<FetchResult> {
  const host = company.atsSlug;
  const seen = new Set<string>();
  const raws: RawJob[] = [];
  for (const loc of ['India', 'Singapore']) {
    const data = await getJson(`https://${host}.eightfold.ai/api/apply/v2/jobs?num=100&location=${encodeURIComponent(loc)}&sort_by=timestamp`) as {
      positions?: Array<{ id?: number | string; name?: string; location?: string; locations?: string[]; department?: string; canonicalPositionUrl?: string }>;
    };
    for (const p of data.positions || []) {
      const key = String(p.id ?? `${p.name}|${p.location}`);
      if (seen.has(key)) continue;
      seen.add(key);
      raws.push({
        title: p.name || '',
        location: [p.location, ...(p.locations || [])].filter(Boolean).join(', '),
        department: p.department || '',
        applyUrl: p.canonicalPositionUrl || `https://${host}.eightfold.ai/careers/job/${p.id}`,
      });
    }
  }
  return ingest(company, raws);
}

// ── Amazon jobs API ──
async function fetchAmazon(company: Company): Promise<FetchResult> {
  const seen = new Set<string>();
  const raws: RawJob[] = [];
  // Country + query combos; freshest first. The API caps result_limit at 100.
  const combos = [
    ['IND', 'software engineer'], ['IND', 'intern'], ['SGP', 'software engineer'],
  ];
  for (const [country, q] of combos) {
    const data = await getJson(`https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(q)}&country=${country}&result_limit=100&offset=0&sort=recent`) as {
      jobs?: Array<{ id_icims?: string; title?: string; normalized_location?: string; job_path?: string; basic_qualifications?: string; description?: string; job_category?: string }>;
    };
    for (const j of data.jobs || []) {
      const key = j.id_icims || `${j.title}|${j.normalized_location}`;
      if (seen.has(key)) continue;
      seen.add(key);
      raws.push({
        title: j.title || '', location: j.normalized_location || '',
        department: j.job_category || '',
        applyUrl: j.job_path ? `https://www.amazon.jobs${j.job_path}` : company.careersUrl,
        content: `${j.basic_qualifications || ''} ${j.description || ''}`,
      });
    }
  }
  return ingest(company, raws);
}

// ── Uber careers API ──
async function fetchUber(company: Company): Promise<FetchResult> {
  // Note: the department facet returns null results — filter client-side instead.
  const data = await getJson('https://www.uber.com/api/loadSearchJobsResults?localeCode=en', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'x' },
    body: JSON.stringify({ params: { location: [{ country: 'IND' }, { country: 'SGP' }], limit: 200, page: 0 } }),
  }) as { data?: { results?: Array<{ id?: number; title?: string; department?: string; description?: string; allLocations?: Array<{ country?: string; city?: string }> }> } };
  return ingest(company, (data.data?.results || []).map(j => ({
    title: j.title || '',
    location: (j.allLocations || []).map(l => [l.city, l.country].filter(Boolean).join(', ')).join(' | ') || 'India',
    department: j.department || '',
    applyUrl: j.id ? `https://www.uber.com/global/en/careers/list/${j.id}/` : company.careersUrl,
    content: j.description || '',
  })));
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

// ── Microsoft careers API ──
async function fetchMicrosoft(company: Company): Promise<FetchResult> {
  const raws: RawJob[] = [];
  for (const lc of ['India', 'Singapore']) {
    for (let pg = 1; pg <= 3; pg++) {
      const data = await getJson(`https://gcsservices.careers.microsoft.com/search/api/v1/search?lc=${encodeURIComponent(lc)}&p=Software%20Engineering&l=en_us&pg=${pg}&pgSz=20&o=Recent`) as {
        operationResult?: { result?: { totalJobs?: number; jobs?: Array<{ jobId?: string; title?: string; properties?: { primaryLocation?: string; description?: string } }> } };
      };
      const jobs = data.operationResult?.result?.jobs || [];
      for (const j of jobs) {
        raws.push({
          title: j.title || '', location: j.properties?.primaryLocation || lc,
          department: 'Software Engineering',
          applyUrl: j.jobId ? `https://jobs.careers.microsoft.com/global/en/job/${j.jobId}` : company.careersUrl,
          content: j.properties?.description || '',
        });
      }
      if (jobs.length < 20) break;
    }
  }
  return ingest(company, raws);
}

const API_ADAPTERS: Record<string, (c: Company) => Promise<FetchResult>> = {
  amazon: fetchAmazon, uber: fetchUber, atlassian: fetchAtlassian, microsoft: fetchMicrosoft,
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
}

export async function runFullScan(): Promise<ScanSummary> {
  const enabled = COMPANIES.filter(c => c.enabled && c.ats !== 'custom');
  const results: ScanSummary['results'] = [];
  const allNew: NewJobInfo[] = [];

  const batchSize = 5;
  for (let i = 0; i < enabled.length; i += batchSize) {
    const batch = enabled.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(async (company) => {
      const r = await fetchJobsForCompany(company);
      await recordScanResult(company.name, r.totalCount, r.newCount, r.error);
      return { company: company.name, newJobs: r.newCount, totalJobs: r.totalCount, error: r.error, list: r.newJobs };
    }));
    for (let k = 0; k < settled.length; k++) {
      const s = settled[k];
      if (s.status === 'fulfilled') {
        results.push({ company: s.value.company, newJobs: s.value.newJobs, totalJobs: s.value.totalJobs, error: s.value.error });
        allNew.push(...s.value.list);
      } else {
        results.push({ company: batch[k].name, newJobs: 0, totalJobs: 0, error: String(s.reason) });
      }
    }
  }

  return {
    scanned: results.length,
    newJobsFound: allNew.length,
    newJobs: allNew.sort((a, b) => b.score - a.score),
    results,
  };
}
