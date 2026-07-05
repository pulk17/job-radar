// Role matching v2 — India + Singapore, JD-content scoring, YoE extraction.
// Profile: C++, TypeScript/Next.js, Python, Go, CP, low-latency systems, 0 YOE.

export type Region = 'india' | 'singapore' | 'remote' | 'other';

const INDIA_LOCATIONS = [
  'india', 'bangalore', 'bengaluru', 'hyderabad', 'mumbai', 'pune',
  'gurgaon', 'gurugram', 'noida', 'delhi', 'chennai', 'kolkata',
  'mysore', 'mysuru', 'ahmedabad',
];

export function detectRegion(location?: string, title?: string): Region {
  const text = `${location || ''} ${title || ''}`.toLowerCase();
  if (INDIA_LOCATIONS.some(kw => text.includes(kw))) return 'india';
  if (text.includes('singapore')) return 'singapore';
  // "Remote" without a conflicting country — only count as remote if not tied elsewhere
  if (/\bremote\b/.test(text) && !/\b(us|usa|united states|uk|london|europe|emea|americas|canada|australia|japan|china|germany|poland|netherlands)\b/.test(text)) {
    return 'remote';
  }
  return 'other';
}

export function isTargetRegion(location?: string, title?: string): boolean {
  return detectRegion(location, title) !== 'other';
}

// ── Keyword banks ──

const POSITIVE_TITLE = [
  'intern', 'internship', 'new grad', 'new graduate', 'entry level', 'entry-level',
  'junior', 'associate', 'analyst', 'fresher', 'campus', 'early career', 'early in career',
  'graduate', 'trainee', 'apprentice', 'co-op', 'coop', 'university',
  'software engineer', 'software developer', 'sde', 'swe', 'member of technical staff',
  'quant', 'quantitative', 'trading', 'trader', 'research engineer',
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

// Title words that immediately signal wrong seniority or wrong function
const NEGATIVE_TITLE = [
  'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'distinguished',
  'vp', 'vice president', 'head of', 'chief', 'architect',
  'sales', 'account executive', 'recruiter', 'marketing', 'legal', 'counsel',
  'hr ', 'human resources', 'finance analyst', 'accountant', 'payroll',
  'administrative', 'executive assistant', 'customer success', 'support engineer ii',
];

// Content phrases signalling senior-only roles
const NEGATIVE_CONTENT = [
  'extensive experience', 'seasoned professional', 'proven leadership',
  'people management experience', 'security clearance', 'us persons only',
];

/**
 * Extract minimum years-of-experience required from JD text.
 * Returns null if nothing detected.
 */
export function extractMinExperience(text: string): number | null {
  const t = text.toLowerCase();
  let min: number | null = null;
  // "3+ years", "3-5 years", "at least 4 years", "minimum of 5 years", "5 yrs"
  const patterns = [
    /(\d{1,2})\s*\+\s*(?:years|yrs)/g,
    /(\d{1,2})\s*(?:-|–|to)\s*\d{1,2}\s*(?:years|yrs)/g,
    /(?:at least|minimum(?: of)?|min\.?)\s*(\d{1,2})\s*(?:years|yrs)/g,
    /(\d{1,2})\s*(?:years|yrs)(?:'|’)?\s*(?:of\s*)?(?:relevant\s*|professional\s*|industry\s*|work(?:ing)?\s*)?experience/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(t))) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n <= 20) min = min === null ? n : Math.min(min, n);
    }
  }
  // Explicit freshness signals override
  if (/\b(0-\d|no prior experience|freshers?|new grad|recent graduate)\b/.test(t)) {
    return 0;
  }
  return min;
}

export interface MatchResult {
  score: number;          // 0..1, or -1 if out of target region
  region: Region;
  matchedKeywords: string[];
  minExperience: number | null;
}

export const MATCH_THRESHOLD = 0.15;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#?\w+;/gi, ' ')
    .replace(/\s+/g, ' ');
}

export function matchJob(title: string, location?: string, department?: string, content?: string): MatchResult {
  const region = detectRegion(location, title);
  if (region === 'other') return { score: -1, region, matchedKeywords: [], minExperience: null };

  const titleLower = title.toLowerCase();
  const body = content ? stripHtml(content).toLowerCase() : '';
  const fullText = `${titleLower} ${(department || '').toLowerCase()} ${body}`;
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

  // 3. Career-stage boost from title
  if (/intern|new grad|entry.level|campus|fresher|trainee|graduate|university|early career/i.test(titleLower)) {
    score += 0.20;
  } else if (/junior|associate\b/i.test(titleLower)) {
    score += 0.12;
  } else if (!/senior|staff|principal|lead|manager|director|architect|distinguished/i.test(titleLower)) {
    score += 0.05;
  }

  // 4. Department fit
  if (department && /engineering|technology|quant|research|development|platform|infrastructure|trading/i.test(department)) {
    score += 0.08;
  }

  // 5. Base for being in a target region
  score += 0.10;
  if (region === 'india') score += 0.02; // slight home-region preference

  // 6. Seniority / wrong-function penalties
  const negTitleHits = NEGATIVE_TITLE.filter(kw => titleLower.includes(kw));
  score -= negTitleHits.length * 0.20;
  const negContentHits = NEGATIVE_CONTENT.filter(kw => fullText.includes(kw));
  score -= negContentHits.length * 0.10;

  // 7. Years-of-experience penalty (profile: 0 YOE)
  const minExperience = extractMinExperience(`${titleLower} ${body}`);
  if (minExperience !== null) {
    if (minExperience >= 5) score -= 0.35;
    else if (minExperience >= 3) score -= 0.20;
    else if (minExperience >= 2) score -= 0.08;
    else score += 0.05; // 0-1 years explicitly OK
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    region,
    matchedKeywords: [...matched].slice(0, 12),
    minExperience,
  };
}

// ── Role type classification ──

export type RoleType = 'intern' | 'newgrad' | 'fulltime';

export function classifyRoleType(title: string): RoleType {
  const t = title.toLowerCase();
  if (/\bintern\b|\binternship\b|\bco-?op\b|\bapprentice\b|\btrainee\b|\bsummer\b.*\b(analyst|associate|program)\b/i.test(t)) {
    return 'intern';
  }
  if (/\bnew grad\b|\bnew graduate\b|\bentry.level\b|\bcampus\b|\bfresher\b|\bearly career\b|\bgraduate\b.*\b(engineer|developer|program|analyst)\b|\buniversity\b|\bcampus hire\b/i.test(t)) {
    return 'newgrad';
  }
  return 'fulltime';
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
