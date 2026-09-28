// Role matching v3 — India + Singapore, tuned for a student hunting internships
// and new-grad roles. Profile: C++, TypeScript/Next.js, Python, Go, CP, 0 YOE.
// Dependency-free on purpose: `node scripts/check-matcher.mjs` runs it directly.

export type Region = 'india' | 'singapore' | 'remote' | 'other';
export type RoleType = 'intern' | 'newgrad' | 'fulltime';

const INDIA_LOCATIONS = [
  'india', 'bangalore', 'bengaluru', 'hyderabad', 'mumbai', 'pune',
  'gurgaon', 'gurugram', 'noida', 'delhi', 'chennai', 'kolkata',
  'mysore', 'mysuru', 'ahmedabad',
];

// Countries/markets that make a "Remote" posting unreachable from India/Singapore.
// e.g. "Backend Engineer - Platform | Sweden | Remote" is remote *within Sweden*.
const FOREIGN_LOCATIONS = new RegExp(
  '\\b(us|usa|u\\.s\\.|united states|american?|canada|toronto|uk|united kingdom|' +
  'london|england|scotland|ireland|dublin|europe|european|emea|eu|germany|berlin|' +
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
  'representative|strategist|policy|billing)\\b', 'i'
);

// Content phrases signalling senior-only roles
const NEGATIVE_CONTENT = [
  'extensive experience', 'seasoned professional', 'proven leadership',
  'people management experience', 'security clearance', 'us persons only',
];

const INTERN_TITLE = /\bintern\b|\binternship\b|\bco-?op\b|\bapprentice(ship)?\b|\btrainee\b|\bsummer (analyst|associate|program)\b/i;
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
  if (/\b(principal|distinguished|architect)\b|(?<!technical )\bstaff\b/.test(t)) return 8;
  if (/\b(senior|sr\.?|lead|sse)\b/.test(t)) return 5;
  if (/\bintermediate\b|\bmid.level\b/.test(t)) return 3;
  // Numeral straight after the role noun: "Engineer II", "SDE-2", "MTS 1", "Staff - II"
  const m = t.match(/\b(?:engineer|developer|sde|swe|scientist|analyst|mts|staff|programmer)\s*[-,]?\s*(iv|iii|ii|i|[1-4])\b/);
  if (m) return ({ i: 0, '1': 0, ii: 2, '2': 2, iii: 4, '3': 4, iv: 6, '4': 6 } as Record<string, number>)[m[1]];
  return null;
}

/**
 * Required years of experience stated in a JD, or null if none.
 *
 * Uses the *largest* stated minimum ("5+ years overall, 2+ years in Go" → 5) and
 * ignores preferred/bonus sections, so a senior role isn't mistaken for an entry
 * one because it also mentions "1+ year of Kubernetes". A number only counts
 * when it reads as experience, not "founded 20 years ago".
 */
export function extractMinExperience(text: string): number | null {
  let t = text.toLowerCase();
  const cut = t.search(/preferred qualifications|preferred skills|nice to have|good to have|bonus points|preferred:/);
  if (cut > 0) t = t.slice(0, cut);

  if (/\b0\s*(-|–|to)\s*[1-2]\s*(years|yrs)|\bfreshers?\b|\brecent graduates?\b|\bnew grads? (are )?(welcome|encouraged|eligible)|\bno (prior )?experience (is )?required/.test(t)) {
    return 0;
  }

  let max: number | null = null;
  const re = /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:years?|yrs?)\b(.{0,60})/g;
  let m;
  while ((m = re.exec(t))) {
    const n = parseInt(m[1], 10);
    const after = m[2];
    const before = t.slice(Math.max(0, m.index - 40), m.index);
    // In a JD, "N years" is almost always an experience ask; skip only the
    // phrasings that clearly aren't (company history, degree length, contract term).
    const saysExperience = /experience|exp\b/.test(after) || /experience|minimum|at least|min\./.test(before);
    if (!saysExperience && /\b(ago|old|history|founded|combined|warranty|degree|programm?e?|course|contract|tenure|duration|legacy|journey|since|over the (past|last))\b/.test(before + after.slice(0, 30))) continue;
    if (n <= 20) max = max === null ? n : Math.max(max, n);
  }
  return max;
}

export interface MatchResult {
  score: number;          // 0..1, or -1 if out of target region / not a software role
  region: Region;
  roleType: RoleType;
  matchedKeywords: string[];
  minExperience: number | null;
}

export const MATCH_THRESHOLD = 0.15;

function stripHtml(html: string): string {
  // Greenhouse ships entity-escaped HTML ("&lt;p&gt;"), so decode before stripping tags.
  return html
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ');
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
  const reject = (): MatchResult => ({ score: -1, region, roleType: 'fulltime', matchedKeywords: [], minExperience: null });
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

  let roleType: RoleType;
  if (levelHint) roleType = levelHint;
  else if (INTERN_TITLE.test(titleLower)) roleType = 'intern';
  else if ((minExperience ?? 0) >= 2) roleType = 'fulltime';        // "Senior New Grad Mentor" is still senior
  else if (NEWGRAD_TITLE.test(titleLower) || minExperience !== null) roleType = 'newgrad'; // explicit, or ≤1 yr asked
  else roleType = 'fulltime';                                        // no level signal at all: "open level"
  // A source that says "early career" (Google SWE II = L3) outranks the numeral.
  if (levelHint && minExperience !== null && minExperience > 1) minExperience = 1;

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
