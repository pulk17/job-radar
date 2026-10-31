// Role matching v3 — India + Singapore, tuned for a student hunting internships
// and new-grad roles. Profile: C++, TypeScript/Next.js, Python, Go, CP, 0 YOE.
// Dependency-free on purpose: `node scripts/check-matcher.mjs` runs it directly.

export type Region = 'india' | 'singapore' | 'remote' | 'other';
export type RoleType = 'intern' | 'newgrad' | 'fulltime';
/** yes = shown; unclear = nothing says either way, kept apart; no = stored but never shown. */
export type Eligibility = 'yes' | 'unclear' | 'no';

const INDIA_LOCATIONS = [
  'india', 'bangalore', 'bengaluru', 'hyderabad', 'mumbai', 'pune',
  'gurgaon', 'gurugram', 'noida', 'delhi', 'chennai', 'kolkata',
  'mysore', 'mysuru', 'ahmedabad',
];

// Countries/markets that make a "Remote" posting unreachable from India/Singapore.
// e.g. "Backend Engineer - Platform | Sweden | Remote" is remote *within Sweden*.
const FOREIGN_LOCATIONS = new RegExp(
  '\\b(us|usa|u\\.s\\.|united states|american?|canada|toronto|uk|united kingdom|' +
  'san francisco|seattle|new york|austin|boston|chicago|los angeles|london|england|scotland|ireland|dublin|europe|european|emea|eu|germany|berlin|' +
  'munich|france|paris|spain|madrid|barcelona|portugal|lisbon|italy|milan|rome|' +
  'netherlands|amsterdam|belgium|poland|warsaw|krakow|romania|bucharest|czech|' +
  'prague|hungary|budapest|greece|athens|sweden|stockholm|norway|oslo|denmark|' +
  'copenhagen|finland|helsinki|switzerland|zurich|austria|vienna|ukraine|estonia|' +
  'latvia|lithuania|bulgaria|serbia|croatia|australia|sydney|melbourne|' +
  'new zealand|japan|tokyo|china|beijing|shanghai|shenzhen|hong kong|taiwan|' +
  'taipei|korea|seoul|vietnam|hanoi|thailand|bangkok|indonesia|jakarta|' +
  'philippines|manila|malaysia|kuala lumpur|brazil|sao paulo|mexico|argentina|' +
  'colombia|chile|peru|nigeria|lagos|kenya|nairobi|south africa|egypt|cairo|' +
  'turkey|istanbul|israel|tel aviv|dubai|uae|abu dhabi|saudi|riyadh|qatar|doha)\\b',
  'i'
);

export function detectRegion(location?: string, title?: string): Region {
  const text = `${location || ''} ${title || ''}`.toLowerCase();
  // An explicit India/Singapore mention wins, even in a multi-site posting.
  if (INDIA_LOCATIONS.some(kw => text.includes(kw))) return 'india';
  if (text.includes('singapore')) return 'singapore';
  // Otherwise "Remote" only counts when it isn't pinned to a foreign market.
  if (/\bremote\b|\banywhere\b/.test(text) && !FOREIGN_LOCATIONS.test(text)) {
    return 'remote';
  }
  return 'other';
}

// ── Keyword banks ──

const POSITIVE_TITLE = [
  'intern', 'internship', 'new grad', 'new graduate', 'entry level', 'entry-level',
  'junior', 'fresher', 'campus', 'early career', 'graduate', 'trainee', 'university',
  'software engineer', 'software developer', 'sde', 'swe', 'member of technical staff',
  'quant', 'quantitative', 'research engineer',
  'developer', 'systems engineer', 'platform engineer',
  'full stack', 'fullstack', 'full-stack',
  'backend', 'back-end', 'back end', 'frontend', 'front-end',
  'devops', 'site reliability', 'sre', 'infrastructure',
];

const POSITIVE_STACK = [
  'c++', 'cpp', 'typescript', 'javascript', 'react', 'next.js', 'nextjs',
  'node.js', 'nodejs', 'python', 'golang', 'go lang',
  'kubernetes', 'k8s', 'docker', 'linux', 'systems programming',
  'low latency', 'low-latency', 'high performance', 'high-performance', 'high frequency',
  'competitive programming', 'algorithms', 'data structures',
  'distributed systems', 'microservices', 'concurrency', 'multithreading', 'multi-threaded',
  'postgresql', 'postgres', 'mongodb', 'redis', 'kafka', 'grpc', 'ci/cd',
  'network programming', 'tcp/ip', 'performance optimization',
];

/**
 * A title must show at least one of these to be considered a software role.
 * Without this, "Financial Analyst Intern" or "Trainee - Recruitment Coordinator"
 * score highly purely on the intern/analyst/trainee career-stage signal.
 */
const ENGINEERING_TITLE = new RegExp(
  '\\b(engineer|engineering|developer|development|programmer|sde|swe|sre|devops|' +
  'scientist|research|quant|quantitative|trader|trading|software|technolog\\w*|' +
  'technical staff|mts|data|machine learning|ml|ai|analytics|platform|infrastructure|' +
  'backend|back-end|frontend|front-end|full.?stack|mobile|android|ios|web|cloud|' +
  'security|cyber|network|system|systems|firmware|embedded|silicon|hardware|' +
  'verification|validation|compiler|database|qa|test|testing|tester|' +
  'automation|robotics|graphics|computer vision|nlp|it)\\b', 'i'
);

// Roles that are clearly not software work even when they contain an engineering-ish word.
const NON_TECH_TITLE = new RegExp(
  '\\b(sales|account executive|account manager|business development|recruiter|' +
  'recruiting|recruitment|talent acquisition|human resources|hr|people operations|' +
  'payroll|financial analyst|finance|accountant|accounting|audit|tax|legal|counsel|' +
  'paralegal|marketing|brand|content writer|copywriter|social media|public relations|' +
  'communications|customer success|customer support|customer service|' +
  'technical account manager|solution consultant|solutions consultant|presales|' +
  'pre-sales|procurement|supply chain|logistics|warehouse|category|merchandising|' +
  'facilities|administrative|executive assistant|office manager|receptionist|' +
  'teacher|trainer|instructor|nurse|physician|driver|coordinator|' +
  // customer-facing "engineer" titles that aren't software development
  'support engineer|technical support|support engineering|escalation|helpdesk|help desk|' +
  'customer engineer|solutions? engineer|solutions? architect|sales engineer|field engineer|' +
  'implementation|onboarding|deployment strategist|success|customer experience|' +
  'technician|business analyst|business systems analyst|' +
  // people management and go-to-market — never a student's role
  'manager|mgr|director|head of|vp|vice president|chief|president|partner|' +
  'representative|strategist|policy|billing|operations specialist|governance)\\b', 'i'
);

// Content phrases signalling senior-only roles
const NEGATIVE_CONTENT = [
  'extensive experience', 'seasoned professional', 'proven leadership',
  'people management experience', 'security clearance', 'us persons only',
];

const INTERN_TITLE = /(?<![a-z])intern(?:ship)?(?![a-z])|\bco-?op\b|\bapprentice(ship)?\b|\btrainee\b|\bsummer (analyst|associate|program)\b/i;
const NEWGRAD_TITLE = new RegExp(
  '\\b(new grads?|new graduates?|graduate|graduates|grad|entry.level|campus|fresher|freshers|' +
  'early career|early.in.career|university|junior|jr\\.?|associate (software|engineer|developer|sde|data)|' +
  'class of 20\\d\\d|20\\d\\d start)\\b', 'i'
);

/**
 * Minimum years of experience a title implies from its level marker, or null
 * when the title carries no level. "SDE II" → 2, "Engineer III" → 4, "Sr" → 5.
 * Level I / 1 (SDE I, MTS-1, Engineer 1) is entry level → 0.
 */
export function titleLevel(title: string): number | null {
  const t = title.toLowerCase();
  if (/\b(principal|distinguished|architect|leader)\b|(?<!technical )\bstaff\b/.test(t)) return 8;
  if (/\b(senior|sr\.?|lead|sse)\b/.test(t)) return 5;
  if (/\bintermediate\b|\bmid.level\b/.test(t)) return 3;
  // Numeral straight after the role noun: "Engineer II", "SDE-2", "MTS 1", "Staff - II"
  const m = t.match(/\b(?:engineer|developer|sde|swe|scientist|analyst|mts|staff|programmer)\s*[-,]?\s*(iv|iii|ii|i|[1-4])\b/);
  if (m) return ({ i: 0, '1': 0, ii: 2, '2': 2, iii: 4, '3': 4, iv: 6, '4': 6 } as Record<string, number>)[m[1]];
  return null;
}

const NUM_WORD: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
const ZERO_RANGE = /\b0\s*(?:-|–|—|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?|yoe)\b/;
const FRESHER = /\bfreshers?\b|\brecent graduates?\b|\bnew grads? (?:are )?(?:welcome|encouraged|eligible)|\bno (?:prior )?experience (?:is )?required/;

/**
 * Required years of experience stated in a JD, or null if none. A range counts from its
 * low end, so "0-3 years" is 0 and "1-3 years" is 1.
 *
 * Uses the *largest* stated minimum ("5+ years overall, 2+ years in Go" → 5) and ignores
 * preferred/bonus sections. This decides whether a role is shown at all, so a number only
 * counts when it reads as a requirement: "grew 3x in 2 years" must not hide a role.
 */
export function extractMinExperience(text: string): number | null {
  let t = text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s*\(\d+\))?(?=\s*(?:\+|plus|or more)?\s*(?:years?|yrs?)\b)/g, (_, w) => NUM_WORD[w]);
  const cut = t.search(/preferred qualifications|preferred skills|nice to have|good to have|bonus points|preferred:/);
  if (cut > 0) t = t.slice(0, cut);

  if (ZERO_RANGE.test(t)) return 0;

  let max: number | null = null;
  const re = /(\d{1,2})\s*(\+|plus|or more)?\s*((?:-|–|—|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?|yoe)\b(.{0,60})/g;
  let m;
  while ((m = re.exec(t))) {
    const n = parseInt(m[1], 10);
    const after = m[4];
    const before = t.slice(Math.max(0, m.index - 40), m.index);
    const saysExperience = /experience|exp\b/.test(after) || /experience|minimum|at least|min\./.test(before);
    const shaped = m[2] || m[3] || /^\s*(?:of|in|working|hands)\b/.test(after);
    if (!saysExperience && (!shaped || /(?:past|last|next|within)\s*$/.test(before)
      || /\b(ago|old|history|founded|combined|warranty|degree|programm?e?|course|contract|tenure|duration|legacy|journey|since)\b/.test(before + after.slice(0, 30)))) continue;
    if (n <= 20) max = max === null ? n : Math.max(max, n);
  }
  return max === null && FRESHER.test(t) ? 0 : max;
}

/** The graduating batch this radar hunts for. */
export const TARGET_BATCH = Number(process.env.TARGET_BATCH) || 2027;
export type BatchFit = 'fit' | 'miss' | null;

/**
 * Does the JD say who it's for? Generic titles ("Software Engineer") often hide
 * "2027 batch only" in the body. A year counts only next to graduation wording, so
 * "FY2027" or "apply by March 2027" don't trigger it. Explicit target year wins, so
 * "2026 or 2027 graduates" is a fit.
 */
export function batchFit(text: string, target = TARGET_BATCH): BatchFit {
  const t = text.toLowerCase();
  const says = (y: number) => new RegExp(
    `\\b(?:class of|batch of|batch:?|graduat\\w*(?: \\w+){0,3}|pass(?:ing)?[- ]?out(?: \\w+){0,2})[ :,-]*${y}\\b` +
    `|\\b${y}[ -]?(?:batch|grad\\w*|pass[- ]?outs?|new grads?|university grad\\w*|start|intake|cohort)\\b`).test(t);
  if (says(target) || /\bfinal[- ]year (?:student|undergrad|b\.?\s?tech|b\.?e\b|engineering)/.test(t)) return 'fit';
  // Penultimate-year roles are for the batch after yours.
  if ([-3, -2, -1, 1, 2].some(d => says(target + d)) || /\b(?:penultimate|pre[- ]final)[- ]year\b/.test(t)) return 'miss';
  return null;
}

const SIX_MONTH_INTERN = /\b(?:6|six)[- ]?months?\b.{0,40}\bintern|\bintern\w*\b.{0,40}\b(?:6|six)[- ]?months?\b|\bwinter intern/;

export interface MatchResult {
  score: number;          // 0..1, or -1 if out of target region / not a software role
  region: Region;
  roleType: RoleType;
  matchedKeywords: string[];
  minExperience: number | null;
  batch: BatchFit;
  elig: Eligibility;
  /** The evidence, shown on the role so you can check the call. */
  why: string;
}

export const MATCH_THRESHOLD = 0.15;

export function stripHtml(html: string): string {
  // Greenhouse ships entity-escaped HTML ("&lt;p&gt;"), so decode before stripping tags.
  return html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ');
}

// Experience wanted, in words rather than numbers.
const SENIOR_BODY = /\b(?:mentor(?:ing|s)? (?:junior|other|fellow)|experienced (?:software |backend |frontend )?engineers?\b|seasoned|extensive (?:hands-on )?experience|proven track record|technical leadership|lead(?:ing)? (?:a )?(?:small )?team)/;

/**
 * Can a 0-experience, TARGET_BATCH graduate apply? Only 0 or 0-n years passes.
 * A source that tags a role early career but asks for a year stays "unclear", not "no":
 * Google's new-grad roles routinely say "1 year of experience" and hire graduates anyway.
 */
function judge(title: string, body: string, roleType: RoleType, hint: RoleType | undefined, fromTitle: number | null, fromBody: number | null, batch: BatchFit): [Eligibility, string] {
  const entry = roleType === 'intern' || !!hint || fromTitle === 0 || NEWGRAD_TITLE.test(title);
  const year = Number(title.match(/\b20[2-3]\d\b/)?.[0]);
  if (batch === 'miss' || (entry && year && year !== TARGET_BATCH)) return ['no', 'For another batch'];
  if (/\bph\.?d\b/.test(title)) return ['no', 'PhD only'];
  if (!hint && fromTitle) return ['no', 'Experienced title'];
  const campus = title.match(/\b(?:iit|nit|iiit|bits)\b(?: \w+)?/)?.[0];
  if (campus) return ['unclear', `Campus drive: ${campus.toUpperCase()}`];
  if (roleType === 'intern') {
    // Summer of your graduation year: these usually require returning to college after.
    if (year === TARGET_BATCH && /\bsummer\b/.test(title)) return ['unclear', `Summer ${year}: may need you back in college`];
    return ['yes', batch === 'fit' ? `Intern · ${TARGET_BATCH} batch` : 'Intern'];
  }
  if (batch === 'fit') return ['yes', `Names ${TARGET_BATCH} batch`];
  if (fromBody) return hint ? ['unclear', `Tagged early career, JD asks ${fromBody} yr`] : ['no', `Asks ${fromBody}+ yrs`];
  if (fromBody === 0) {
    const range = body.match(ZERO_RANGE);
    return ['yes', range ? `JD asks 0-${range[1]} yrs` : 'JD open to freshers'];
  }
  if (entry) return ['yes', hint ? 'Source tags it early career' : 'Entry-level title'];
  if (SENIOR_BODY.test(body)) return ['no', 'Reads as experienced'];
  return ['unclear', body ? 'JD states no experience' : 'No JD available'];
}

/**
 * @param focusBoost  tier weighting from lib/companies.ts TIER_FOCUS
 * @param levelHint   the source's own career-level tag (Google's "Early" filter,
 *                    TikTok's "Intern"/"Graduate" recruit type) — beats title parsing
 */
export function matchJob(
  title: string, location?: string, department?: string, content?: string,
  focusBoost = 0, levelHint?: RoleType,
): MatchResult {
  const region = detectRegion(location, title);
  const reject = (): MatchResult => ({ score: -1, region, roleType: 'fulltime', matchedKeywords: [], minExperience: null, batch: null, elig: 'no', why: '' });
  if (region === 'other') return reject();

  const titleLower = title.toLowerCase();

  // Hard gate: must look like a software role, and must not be a clearly
  // non-technical or people-management one.
  if (!ENGINEERING_TITLE.test(titleLower) || NON_TECH_TITLE.test(titleLower)) return reject();

  const body = content ? stripHtml(content).toLowerCase() : '';
  const fullText = `${titleLower} ${(department || '').toLowerCase()} ${body}`;

  // Seniority: the stricter of what the title's level implies and what the JD asks for.
  const fromTitle = titleLevel(title);
  const fromBody = extractMinExperience(`${titleLower} ${body}`);
  let minExperience = fromTitle === null ? fromBody : fromBody === null ? fromTitle : Math.max(fromTitle, fromBody);

  const batch = batchFit(`${titleLower} ${body}`);

  let roleType: RoleType;
  if (levelHint) roleType = levelHint;
  else if (INTERN_TITLE.test(titleLower)) roleType = 'intern';
  else if ((minExperience ?? 0) >= 1) roleType = 'fulltime';        // "Senior New Grad Mentor" is still senior
  else if (SIX_MONTH_INTERN.test(fullText)) roleType = 'intern';     // 6-month internships posted under generic titles
  else if (NEWGRAD_TITLE.test(titleLower) || minExperience === 0 || batch === 'fit') roleType = 'newgrad'; // explicit, 0 yrs asked, or the JD names your batch
  else roleType = 'fulltime';                                        // no level signal at all: "open level"
  // A source that says "early career" (Google SWE II = L3) outranks the numeral.
  if (levelHint && minExperience !== null && minExperience > 1) minExperience = 1;

  const [elig, why] = judge(titleLower, body, roleType, levelHint, fromTitle, fromBody, batch);

  const matched = new Set<string>();
  let score = 0;

  // 1. Title role fit (max 0.30)
  const titleHits = POSITIVE_TITLE.filter(kw => titleLower.includes(kw));
  titleHits.forEach(kw => matched.add(kw));
  score += Math.min(titleHits.length * 0.06, 0.30);

  // 2. Stack fit from title + department + JD body (max 0.25)
  const stackHits = POSITIVE_STACK.filter(kw => fullText.includes(kw));
  stackHits.forEach(kw => matched.add(kw));
  score += Math.min(stackHits.length * 0.04, 0.25);

  // 3. Career stage — the thing a student cares about most
  if (roleType !== 'fulltime') score += 0.22;
  if (batch === 'fit') score += 0.12;
  else if (batch === 'miss') score -= 0.25;

  // 4. Department fit
  if (department && /engineering|technology|quant|research|development|platform|infrastructure|trading/i.test(department)) {
    score += 0.08;
  }

  // 5. Base for being in a target region, plus tier focus
  score += 0.10 + focusBoost;
  if (region === 'india') score += 0.02; // slight home-region preference

  // 6. Wrong-fit penalties
  score -= NEGATIVE_CONTENT.filter(kw => fullText.includes(kw)).length * 0.10;
  if (/\bph\.?d\b/.test(titleLower)) score -= 0.30;  // PhD-only intern/research tracks

  // 7. Experience asked vs a student's 0 years
  if (minExperience !== null) {
    if (minExperience >= 5) score -= 0.45;
    else if (minExperience >= 3) score -= 0.30;
    else if (minExperience >= 2) score -= 0.15;
    else score += 0.05; // 0–1 years explicitly OK
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    region,
    roleType,
    matchedKeywords: [...matched].slice(0, 12),
    minExperience,
    batch,
    elig,
    why,
  };
}

// ── Language detection ──

const LANG_DETECTORS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'Python', pattern: /\bpython\b/i },
  { key: 'C++', pattern: /c\+\+|c\/c\+\+|\bcpp\b/i },
  { key: 'Java', pattern: /\bjava\b(?!\s*script)/i },
  { key: 'JavaScript', pattern: /\bjavascript\b|\breact\b|\bnode\.?js\b|\bnext\.?js\b|\bvue\.?js\b|\bangular\b/i },
  { key: 'TypeScript', pattern: /\btypescript\b/i },
  { key: 'Go', pattern: /\bgolang\b|\bgo\s+lang\b/i },
  { key: 'Rust', pattern: /\brust\b/i },
  { key: 'C#', pattern: /\bc#\b|\.net\b|\bdotnet\b/i },
  { key: 'Scala', pattern: /\bscala\b/i },
  { key: 'Ruby', pattern: /\bruby\b|\brails\b/i },
  { key: 'SQL', pattern: /\bsql\b|\bpostgres\b|\bmysql\b/i },
  { key: 'Kotlin', pattern: /\bkotlin\b/i },
  { key: 'Swift', pattern: /\bswift\b/i },
  { key: 'Verilog', pattern: /\bverilog\b|\bvhdl\b|\brtl\b/i },
  { key: 'CUDA', pattern: /\bcuda\b/i },
];

export function detectLanguages(title: string, content?: string): string[] {
  const text = `${title} ${content ? stripHtml(content) : ''}`;
  const found: string[] = [];
  for (const { key, pattern } of LANG_DETECTORS) {
    if (pattern.test(text)) found.push(key);
  }
  return found;
}
