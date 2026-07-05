// Hiring calendar intelligence — India + Singapore cycles, refreshed 2026-07.
// Sources: company career pages, placement reports, quantt.co.uk guides, community reports.
// Company names must match lib/companies.ts.

export interface HiringWindow {
  company: string;
  tier: string;
  internAppsOpen: string;     // "Jul-Aug" format
  internAppsClose: string;
  newGradOpen: string;
  newGradClose: string;
  peakMonths: number[];       // 1-12
  hiringStyle: 'early' | 'rolling' | 'campus' | 'year-round';
  notes: string;
}

export const HIRING_CALENDAR: HiringWindow[] = [
  // ── Quant / HFT ──
  { company: 'Jane Street', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Dec', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Summer 2027 apps open Aug 2026, rolling — first 2 weeks matter most. HK/SG offices for Asia. FOCUS program as fast-track.' },
  { company: 'Hudson River Trading', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Jan', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Singapore office hires SWE/Algo interns + new grads. Apply within days of opening — rolling and extremely competitive.' },
  { company: 'Jump Trading', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Aug', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'early', notes: 'Singapore office. C++/FPGA heavy. Rolling.' },
  { company: 'Optiver', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Dec', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Mumbai + Singapore. 2027 summer apps open Aug 2026. Math/probability emphasis in first rounds.' },
  { company: 'IMC Trading', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Sep', newGradClose: 'Dec', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Mumbai. Technical + trading aptitude tests.' },
  { company: 'DRW', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'early', notes: 'Singapore office. SWE + trading roles.' },
  { company: 'Virtu Financial', tier: 'quant', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Singapore. Market making infra, C++/Java.' },
  { company: 'XTX Markets', tier: 'quant', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Singapore + new Mumbai presence. ML-driven trading; Python/C++.' },
  { company: 'Tower Research Capital', tier: 'quant', internAppsOpen: 'Jul', internAppsClose: 'Dec', newGradOpen: 'Jul', newGradClose: 'Mar', peakMonths: [7, 8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Gurgaon + Singapore. Year-round C++ hiring. Strong IIT pipeline.' },
  { company: 'Citadel Securities', tier: 'quant', internAppsOpen: 'Jul', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Jan', peakMonths: [7, 8, 9, 10], hiringStyle: 'early', notes: 'Gurgaon (GQS). Data Open competition as pipeline. HackerRank early screen. Rolling — apply ASAP.' },
  { company: 'Two Sigma', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Mumbai. Technical assessment early in process.' },
  { company: 'DE Shaw India', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11, 12], hiringStyle: 'campus', notes: 'Hyderabad. Heavy IIT campus presence (Day 1). Off-campus via apply.deshaw.com — Nexus/Ascend programs.' },
  { company: 'Graviton Research Capital', tier: 'quant', internAppsOpen: 'Jul', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Dec', peakMonths: [7, 8, 9, 10], hiringStyle: 'campus', notes: 'Gurgaon. Strong IIT campus hiring. C++/low-latency focus.' },
  { company: 'Squarepoint Capital', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore + Singapore (39 SG openings at last scan). Python/C++ systematic trading.' },
  { company: 'Point72 / Cubist', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'early', notes: 'Bangalore hub growing fast (44 openings at last scan) + Singapore. Academy program for new grads.' },
  { company: 'Millennium', tier: 'quant', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore office (50+ roles) + Singapore. Eightfold portal. Infra/data engineering heavy.' },
  { company: 'WorldQuant', tier: 'quant', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8, 9], hiringStyle: 'rolling', notes: 'Research consultant model — Alpha challenges as entry point. Remote-friendly.' },
  { company: 'Qube Research & Technologies', tier: 'quant', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Mumbai + Singapore. Growing India presence.' },
  { company: 'SIG (Susquehanna)', tier: 'quant', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'early', notes: 'Poker/game theory interview style. Mumbai presence small — check regularly.' },

  // ── Big Tech ──
  { company: 'Google', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Aug', newGradClose: 'Nov', peakMonths: [8, 9, 10, 11], hiringStyle: 'early', notes: 'India SWE Intern + STEP open Sep-Nov for next summer and close within 2-3 weeks. Set alerts on careers.google.com in August.' },
  { company: 'Microsoft', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Aug', newGradClose: 'Nov', peakMonths: [8, 9, 10, 11], hiringStyle: 'early', notes: 'Apps open 6-8 months before start (Sep-Nov for summer). Explore program for 1st/2nd years. Rolling until filled.' },
  { company: 'Amazon', tier: 'faang', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [7, 8, 9, 10], hiringStyle: 'rolling', notes: 'Rolling SDE hiring, OA-heavy. Fall openings for summer interns fill fast — apply the week they post.' },
  { company: 'Meta', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Dec', peakMonths: [9, 10, 11], hiringStyle: 'early', notes: 'Few India intern spots; Singapore has more. System design emphasis for E3.' },
  { company: 'Apple', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Hyderabad/Bangalore. Team-by-team postings on jobs.apple.com — search often.' },
  { company: 'Netflix', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Mumbai + Singapore. Senior-heavy; entry roles rare but high-paying.' },
  { company: 'Uber', tier: 'faang', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore/Hyderabad. SDE + ML roles.' },
  { company: 'Adobe (University)', tier: 'faang', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Dec', peakMonths: [8, 9, 10], hiringStyle: 'campus', notes: 'Noida/Bangalore. University board on Workday. Research internships via Adobe Research.' },
  { company: 'Salesforce', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Hyderabad/Bangalore. Futureforce intern program.' },
  { company: 'LinkedIn', tier: 'faang', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Sep', newGradClose: 'Dec', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Bangalore. Microsoft subsidiary — similar timeline.' },
  { company: 'Stripe', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore + Singapore engineering. New grad roles appear sporadically — radar catches them.' },
  { company: 'TikTok / ByteDance', tier: 'faang', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Aug', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Singapore is the regional hub — large intern + new grad classes. joinbytedance.com.' },
  { company: 'Sea (Shopee/Garena)', tier: 'faang', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Aug', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'campus', notes: 'Singapore. Sea Talent programs; hires many international grads with visa sponsorship.' },
  { company: 'Grab', tier: 'faang', internAppsOpen: 'Sep', internAppsClose: 'Jan', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [9, 10, 11, 12, 1], hiringStyle: 'campus', notes: 'Singapore + Bangalore. GrabTech campus programs.' },

  // ── AI Labs ──
  { company: 'OpenAI', tier: 'ai', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Singapore office (31 roles at last scan) + new Bangalore presence. Residency program as entry path.' },
  { company: 'Anthropic', tier: 'ai', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 9, 10], hiringStyle: 'rolling', notes: 'Bangalore office announced 2026 + Singapore. Watch for India-tagged roles — new and growing.' },
  { company: 'Sarvam AI', tier: 'ai', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. India\'s sovereign-AI lab — 62 open roles at last scan. Fast process.' },
  { company: 'Glean', tier: 'ai', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. Enterprise AI search; 27 India roles at last scan.' },

  // ── Product & Cloud ──
  { company: 'Atlassian', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore + remote India. Own careers API (radar scans it directly).' },
  { company: 'Databricks', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore (78 India roles at last scan). Data/ML infra.' },
  { company: 'Snowflake', tier: 'product', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore/Pune. Now on Ashby.' },
  { company: 'Okta', tier: 'product', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore is a major hub — 107 India roles at last scan.' },
  { company: 'ServiceNow', tier: 'product', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Hyderabad/Bangalore. RiseUp early-career program.' },
  { company: 'Arista Networks', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Aug', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'campus', notes: 'Bangalore/Pune. Excellent comp for networking/C++ engineers. Campus + off-campus.' },
  { company: 'CrowdStrike', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore/Pune. University program for interns.' },
  { company: 'MongoDB', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Gurgaon/Bangalore. C++ database engineering.' },
  { company: 'Rubrik', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore/Pune. Go + distributed systems.' },
  { company: 'Postman', tier: 'product', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. API platform.' },
  { company: 'Freshworks', tier: 'product', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Mar', peakMonths: [8, 9, 10, 1, 2], hiringStyle: 'rolling', notes: 'Chennai/Bangalore. Campus drives at top colleges.' },

  // ── Banking & Fintech ──
  { company: 'Goldman Sachs', tier: 'banking', internAppsOpen: 'Jul', internAppsClose: 'Sep', newGradOpen: 'Jul', newGradClose: 'Oct', peakMonths: [7, 8, 9], hiringStyle: 'early', notes: 'Bangalore + Singapore. New Analyst apps open ~July 1. HireVue + coding tests. APPLY NOW if July-Sep.' },
  { company: 'Morgan Stanley', tier: 'banking', internAppsOpen: 'Apr', internAppsClose: 'Aug', newGradOpen: 'Apr', newGradClose: 'Sep', peakMonths: [4, 5, 6, 7, 8], hiringStyle: 'early', notes: 'Mumbai/Bangalore. Opens as early as April — one of the earliest cycles. Apply immediately when open.' },
  { company: 'JPMorgan Chase', tier: 'banking', internAppsOpen: 'Jul', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Dec', peakMonths: [7, 8, 9, 10], hiringStyle: 'early', notes: 'India + Singapore. Code for Good hackathon (apply Jul-Aug) is the main intern pipeline.' },
  { company: 'American Express', tier: 'banking', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'campus', notes: 'Gurgaon/Bangalore. Campus + Eightfold portal.' },
  { company: 'Visa', tier: 'banking', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Bangalore. Payment infra. Java/C++.' },
  { company: 'Mastercard', tier: 'banking', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Gurgaon/Pune. LaunchPad new grad program.' },
  { company: 'GIC Singapore', tier: 'banking', internAppsOpen: 'Aug', internAppsClose: 'Oct', newGradOpen: 'Aug', newGradClose: 'Nov', peakMonths: [8, 9, 10], hiringStyle: 'early', notes: 'Singapore sovereign fund. TAP grad program for tech. Sponsors visas.' },
  { company: 'Coinbase', tier: 'banking', internAppsOpen: 'Sep', internAppsClose: 'Nov', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [9, 10, 11], hiringStyle: 'rolling', notes: 'Remote India + Singapore. Crypto pays SF-adjacent comp.' },
  { company: 'OKX', tier: 'banking', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 8, 9, 10], hiringStyle: 'year-round', notes: 'Singapore hub — 129 openings at last scan. Exchange infra.' },
  { company: 'Crypto.com', tier: 'banking', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 8, 9], hiringStyle: 'year-round', notes: 'Singapore. 28 openings at last scan.' },

  // ── Semiconductor / Hardware ──
  { company: 'NVIDIA', tier: 'semi', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Sep', newGradClose: 'Jan', peakMonths: [9, 10, 11, 12, 1], hiringStyle: 'rolling', notes: 'Hyderabad/Pune/Bangalore. Ignite (intern) + N.Ex.T programs. GPU/compiler/systems. C++/CUDA.' },
  { company: 'Qualcomm', tier: 'semi', internAppsOpen: 'Jul', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [7, 8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Hyderabad/Bangalore. Summer intern reqs open ~July. Now on Eightfold portal.' },
  { company: 'AMD', tier: 'semi', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [9, 10, 11, 12], hiringStyle: 'campus', notes: 'Hyderabad/Bangalore. Opens ~2-4 months before start date.' },
  { company: 'Intel', tier: 'semi', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [9, 10, 11, 12], hiringStyle: 'campus', notes: 'Bangalore/Hyderabad. Join Talent Portal for alerts. Campus drives Sep-Dec.' },
  { company: 'ARM', tier: 'semi', internAppsOpen: 'Sep', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [9, 10, 11, 12], hiringStyle: 'campus', notes: 'Bangalore/Noida. CPU design. Verilog/C++ roles.' },
  { company: 'Samsung', tier: 'semi', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Aug', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'campus', notes: 'SRI-Bangalore/Noida. Large campus program; off-campus via Workday board.' },
  { company: 'Texas Instruments', tier: 'semi', internAppsOpen: 'Aug', internAppsClose: 'Nov', newGradOpen: 'Aug', newGradClose: 'Dec', peakMonths: [8, 9, 10, 11], hiringStyle: 'campus', notes: 'Bangalore. Among the best hardware pay in India. Campus-heavy.' },
  { company: 'Micron', tier: 'semi', internAppsOpen: 'Aug', internAppsClose: 'Dec', newGradOpen: 'Sep', newGradClose: 'Feb', peakMonths: [8, 9, 10, 11], hiringStyle: 'rolling', notes: 'Hyderabad + Singapore fabs. Memory/firmware roles.' },

  // ── Indian Startups / Scale-ups ──
  { company: 'PhonePe', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. 50 open roles at last scan. Java + distributed systems.' },
  { company: 'Razorpay', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. Payments infra.' },
  { company: 'Paytm', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 7, 8, 9], hiringStyle: 'year-round', notes: 'Noida/Bangalore. Volume hirer — 187 open roles at last scan.' },
  { company: 'Meesho', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. 40 open roles at last scan.' },
  { company: 'Flipkart', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. GRiD challenge as campus pipeline; peak around Apr + Aug-Sep.' },
  { company: 'CRED', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. Small eng team — selective.' },
  { company: 'Groww', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 7, 8, 9], hiringStyle: 'year-round', notes: 'Bangalore. Investment platform.' },
  { company: 'Dream11', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8], hiringStyle: 'year-round', notes: 'Mumbai. High-scale distributed systems (IPL peak!).' },
  { company: 'Zerodha', tier: 'startup', internAppsOpen: 'Year-round', internAppsClose: '', newGradOpen: 'Year-round', newGradClose: '', peakMonths: [1, 2, 3, 7, 8], hiringStyle: 'year-round', notes: 'Bangalore. Go + Python. Tiny team — very selective, hires via public challenges.' },
];

// Get current month's active hiring windows
export function getActiveWindows(): HiringWindow[] {
  const month = new Date().getMonth() + 1; // 1-12
  return HIRING_CALENDAR.filter(h => h.peakMonths.includes(month));
}

// Get upcoming windows (next 1-3 months)
export function getUpcomingWindows(): HiringWindow[] {
  const month = new Date().getMonth() + 1;
  const upcoming = [(month % 12) + 1, ((month + 1) % 12) + 1, ((month + 2) % 12) + 1];
  return HIRING_CALENDAR.filter(h =>
    h.peakMonths.some(m => upcoming.includes(m)) &&
    !h.peakMonths.includes(month)
  );
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMonthName(m: number): string {
  return MONTH_NAMES[m - 1] || '';
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}
