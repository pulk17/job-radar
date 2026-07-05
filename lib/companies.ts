export type Tier = 'quant' | 'faang' | 'product' | 'banking' | 'semi' | 'startup' | 'ai';
export type ATSPlatform =
  | 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters'
  | 'workday'     // atsSlug format: "tenant/wdN/site"
  | 'eightfold'   // atsSlug: eightfold host prefix, e.g. "mlp" → mlp.eightfold.ai
  | 'api'         // atsSlug: custom adapter key ('amazon' | 'uber' | 'atlassian' | 'microsoft')
  | 'custom';     // no public API — link-only, tracked in coverage panel

export interface Company {
  name: string;
  tier: Tier;
  location: string;
  salary: string;
  careersUrl: string;
  ats: ATSPlatform;
  atsSlug?: string;
  enabled: boolean;
  /** Verified against the live API (date of last manual verification) */
  verified?: string;
}

export const TIER_META: Record<Tier, { label: string; color: string }> = {
  quant:   { label: 'Quant/HFT',  color: '#a855f7' },
  faang:   { label: 'Big Tech',   color: '#3b82f6' },
  ai:      { label: 'AI Labs',    color: '#14b8a6' },
  product: { label: 'Product',    color: '#22c55e' },
  banking: { label: 'Banking',    color: '#eab308' },
  semi:    { label: 'Hardware',   color: '#ef4444' },
  startup: { label: 'Startup',    color: '#f97316' },
};

// All non-'custom' entries verified against live APIs on 2026-07-05.
// india/sg counts at verification time are noted in comments.
export const COMPANIES: Company[] = [
  // ── Quant / HFT ──
  { name: 'Jane Street', tier: 'quant', location: 'Hong Kong, Singapore', salary: 'S$200–400K', careersUrl: 'https://www.janestreet.com/join-jane-street/open-roles/', ats: 'greenhouse', atsSlug: 'janestreet', enabled: true, verified: '2026-07-05' }, // 202 total, 14 SG
  { name: 'Hudson River Trading', tier: 'quant', location: 'Singapore', salary: 'S$250–450K', careersUrl: 'https://www.hudsonrivertrading.com/careers/', ats: 'greenhouse', atsSlug: 'wehrtyou', enabled: true, verified: '2026-07-05' }, // 20 SG, 1 India
  { name: 'Jump Trading', tier: 'quant', location: 'Singapore', salary: 'S$250–450K', careersUrl: 'https://www.jumptrading.com/careers/', ats: 'greenhouse', atsSlug: 'jumptrading', enabled: true, verified: '2026-07-05' }, // 11 SG, 2 India
  { name: 'Tower Research Capital', tier: 'quant', location: 'Gurgaon, Singapore', salary: '₹70L–1.5Cr', careersUrl: 'https://www.tower-research.com/open-positions', ats: 'greenhouse', atsSlug: 'towerresearchcapital', enabled: true, verified: '2026-07-05' }, // 13 India, 17 SG
  { name: 'Optiver', tier: 'quant', location: 'Mumbai, Singapore', salary: '₹70L–1.5Cr', careersUrl: 'https://optiver.com/working-at-optiver/career-opportunities/', ats: 'greenhouse', atsSlug: 'optiverus', enabled: true, verified: '2026-07-05' }, // 3 India, 8 SG
  { name: 'IMC Trading', tier: 'quant', location: 'Mumbai', salary: '₹60L–1.2Cr', careersUrl: 'https://careers.imc.com/', ats: 'greenhouse', atsSlug: 'imc', enabled: true, verified: '2026-07-05' }, // 12 India
  { name: 'DRW', tier: 'quant', location: 'Singapore', salary: 'S$200–400K', careersUrl: 'https://www.drw.com/work-at-drw', ats: 'greenhouse', atsSlug: 'drweng', enabled: true, verified: '2026-07-05' }, // 15 SG
  { name: 'Virtu Financial', tier: 'quant', location: 'Singapore', salary: 'S$150–300K', careersUrl: 'https://www.virtu.com/careers/', ats: 'greenhouse', atsSlug: 'virtu', enabled: true, verified: '2026-07-05' }, // 11 SG
  { name: 'XTX Markets', tier: 'quant', location: 'Singapore, Mumbai', salary: 'S$200–400K', careersUrl: 'https://www.xtxmarkets.com/careers/', ats: 'greenhouse', atsSlug: 'xtxmarketstechnologies', enabled: true, verified: '2026-07-05' }, // 2 SG
  { name: 'Flow Traders', tier: 'quant', location: 'Singapore (opens cyclically)', salary: 'S$150–300K', careersUrl: 'https://www.flowtraders.com/careers', ats: 'greenhouse', atsSlug: 'flowtraders', enabled: true, verified: '2026-07-05' },
  { name: 'Qube Research & Technologies', tier: 'quant', location: 'Mumbai, Singapore', salary: '₹60L–1.2Cr', careersUrl: 'https://www.qube-rt.com/careers/', ats: 'greenhouse', atsSlug: 'quberesearchandtechnologies', enabled: true, verified: '2026-07-05' }, // 8 India, 13 SG
  { name: 'Squarepoint Capital', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹50L–1Cr', careersUrl: 'https://www.squarepoint-capital.com/careers', ats: 'greenhouse', atsSlug: 'squarepointcapital', enabled: true, verified: '2026-07-05' }, // 26 India, 39 SG
  { name: 'Graviton Research Capital', tier: 'quant', location: 'Gurgaon', salary: '₹80L–1.5Cr', careersUrl: 'https://gravitonresearch.com/careers/', ats: 'greenhouse', atsSlug: 'gravitonresearchcapital', enabled: true, verified: '2026-07-05' }, // 13 India
  { name: 'Point72 / Cubist', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹50L–1.2Cr', careersUrl: 'https://careers.point72.com/', ats: 'greenhouse', atsSlug: 'point72', enabled: true, verified: '2026-07-05' }, // 44 India, 18 SG
  { name: 'Millennium', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹60L–1.5Cr', careersUrl: 'https://www.mlp.com/current-opportunities/', ats: 'eightfold', atsSlug: 'mlp', enabled: true, verified: '2026-07-05' }, // 50+ India
  { name: 'WorldQuant', tier: 'quant', location: 'Mumbai, Singapore, Remote', salary: '₹30–80L', careersUrl: 'https://www.worldquant.com/career-listing/', ats: 'greenhouse', atsSlug: 'worldquant', enabled: true, verified: '2026-07-05' }, // 6 India
  { name: 'DE Shaw India', tier: 'quant', location: 'Hyderabad', salary: '₹40–80L', careersUrl: 'https://www.deshawindia.com/careers', ats: 'custom', enabled: true },
  { name: 'Citadel Securities', tier: 'quant', location: 'Gurgaon', salary: '₹80L–1.5Cr', careersUrl: 'https://www.citadelsecurities.com/careers/open-opportunities/', ats: 'custom', enabled: true },
  { name: 'Two Sigma', tier: 'quant', location: 'Mumbai', salary: '₹70L–1.2Cr', careersUrl: 'https://careers.twosigma.com/', ats: 'custom', enabled: true },
  { name: 'SIG (Susquehanna)', tier: 'quant', location: 'Mumbai', salary: '₹60L–1.2Cr', careersUrl: 'https://careers.sig.com/', ats: 'custom', enabled: true },
  { name: 'Quadeye Securities', tier: 'quant', location: 'Gurgaon', salary: '₹35–70L', careersUrl: 'https://quadeye.com/careers/', ats: 'custom', enabled: true },
  { name: 'AlphaGrep Securities', tier: 'quant', location: 'Mumbai', salary: '₹40–80L', careersUrl: 'https://www.alphagrep.com/careers.html', ats: 'custom', enabled: true },
  { name: 'NK Securities Research', tier: 'quant', location: 'Gurgaon', salary: '₹50L–1Cr', careersUrl: 'https://www.nksecurities.com/', ats: 'custom', enabled: true },
  { name: 'QuantBox Research', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹50L–1Cr', careersUrl: 'https://www.quantbox.in/', ats: 'custom', enabled: true },
  { name: 'iRage Capital', tier: 'quant', location: 'Mumbai', salary: '₹30–60L', careersUrl: 'https://iragecapital.com/careers/', ats: 'custom', enabled: true },
  { name: 'Grasshopper Asia', tier: 'quant', location: 'Singapore', salary: 'S$120–250K', careersUrl: 'https://grasshopperasia.com/careers/', ats: 'custom', enabled: true },

  // ── Big Tech ──
  { name: 'Amazon', tier: 'faang', location: 'Bangalore, Hyderabad, Singapore', salary: '₹30–50L', careersUrl: 'https://www.amazon.jobs/en/search?base_query=software&loc_query=India', ats: 'api', atsSlug: 'amazon', enabled: true, verified: '2026-07-05' }, // 1272 India hits
  { name: 'Uber', tier: 'faang', location: 'Bangalore, Hyderabad', salary: '₹35–55L', careersUrl: 'https://www.uber.com/us/en/careers/list/', ats: 'api', atsSlug: 'uber', enabled: true, verified: '2026-07-05' },
  { name: 'Atlassian', tier: 'faang', location: 'Bangalore, Remote India', salary: '₹30–45L', careersUrl: 'https://www.atlassian.com/company/careers/all-jobs', ats: 'api', atsSlug: 'atlassian', enabled: true, verified: '2026-07-05' }, // 16 India
  { name: 'Microsoft', tier: 'faang', location: 'Hyderabad, Bangalore', salary: '₹35–55L', careersUrl: 'https://jobs.careers.microsoft.com/global/en/search?lc=India', ats: 'api', atsSlug: 'microsoft', enabled: true },
  { name: 'Salesforce', tier: 'faang', location: 'Hyderabad, Bangalore', salary: '₹30–50L', careersUrl: 'https://careers.salesforce.com/', ats: 'workday', atsSlug: 'salesforce/wd12/External_Career_Site', enabled: true, verified: '2026-07-05' }, // 265 India-search hits
  { name: 'Adobe (University)', tier: 'faang', location: 'Noida, Bangalore', salary: '₹25–45L', careersUrl: 'https://adobe.wd5.myworkdayjobs.com/external_university', ats: 'workday', atsSlug: 'adobe/wd5/external_university', enabled: true },
  { name: 'Adobe', tier: 'faang', location: 'Noida, Bangalore', salary: '₹25–45L', careersUrl: 'https://adobe.wd5.myworkdayjobs.com/external_experienced', ats: 'workday', atsSlug: 'adobe/wd5/external_experienced', enabled: true },
  { name: 'Netflix', tier: 'faang', location: 'Mumbai, Singapore', salary: '₹40–80L', careersUrl: 'https://explore.jobs.netflix.net/careers', ats: 'eightfold', atsSlug: 'netflix', enabled: true, verified: '2026-07-05' },
  { name: 'Airbnb', tier: 'faang', location: 'Bangalore (remote-friendly)', salary: '₹35–60L', careersUrl: 'https://careers.airbnb.com/', ats: 'greenhouse', atsSlug: 'airbnb', enabled: true, verified: '2026-07-05' }, // 11 India
  { name: 'Stripe', tier: 'faang', location: 'Bangalore, Singapore', salary: '₹35–60L', careersUrl: 'https://stripe.com/jobs', ats: 'greenhouse', atsSlug: 'stripe', enabled: true, verified: '2026-07-05' }, // 36 India, 28 SG
  { name: 'DoorDash', tier: 'faang', location: 'Pune, Hyderabad', salary: '₹30–50L', careersUrl: 'https://careers.doordash.com/', ats: 'greenhouse', atsSlug: 'doordashusa', enabled: true, verified: '2026-07-05' }, // 9 India
  { name: 'Pinterest', tier: 'faang', location: 'Bangalore (rare)', salary: '₹30–50L', careersUrl: 'https://www.pinterestcareers.com/', ats: 'greenhouse', atsSlug: 'pinterest', enabled: false },
  { name: 'Google', tier: 'faang', location: 'Bangalore, Hyderabad, Singapore', salary: '₹40–70L', careersUrl: 'https://www.google.com/about/careers/applications/jobs/results/?location=India', ats: 'custom', enabled: true },
  { name: 'Meta', tier: 'faang', location: 'Gurgaon, Bangalore, Singapore', salary: '₹50–80L', careersUrl: 'https://www.metacareers.com/jobs?offices[0]=Bangalore%2C%20India', ats: 'custom', enabled: true },
  { name: 'Apple', tier: 'faang', location: 'Hyderabad, Bangalore, Singapore', salary: '₹35–55L', careersUrl: 'https://jobs.apple.com/en-in/search?location=india-INDC', ats: 'custom', enabled: true },
  { name: 'LinkedIn', tier: 'faang', location: 'Bangalore', salary: '₹30–50L', careersUrl: 'https://careers.linkedin.com/', ats: 'custom', enabled: true },
  { name: 'TikTok / ByteDance', tier: 'faang', location: 'Singapore', salary: 'S$100–180K', careersUrl: 'https://joinbytedance.com/search?location=Singapore', ats: 'custom', enabled: true },
  { name: 'Sea (Shopee/Garena)', tier: 'faang', location: 'Singapore', salary: 'S$80–150K', careersUrl: 'https://career.sea.com/', ats: 'custom', enabled: true },
  { name: 'Grab', tier: 'faang', location: 'Singapore, Bangalore', salary: 'S$80–150K', careersUrl: 'https://www.grab.careers/en/jobs/', ats: 'custom', enabled: true },

  // ── AI Labs ──
  { name: 'OpenAI', tier: 'ai', location: 'Singapore, Bangalore (new)', salary: 'S$200–400K', careersUrl: 'https://openai.com/careers/', ats: 'ashby', atsSlug: 'openai', enabled: true, verified: '2026-07-05' }, // 9 India, 31 SG
  { name: 'Anthropic', tier: 'ai', location: 'Bangalore (new), Singapore', salary: 'S$250–450K', careersUrl: 'https://www.anthropic.com/careers', ats: 'greenhouse', atsSlug: 'anthropic', enabled: true, verified: '2026-07-05' }, // 3 India, 7 SG
  { name: 'Sarvam AI', tier: 'ai', location: 'Bangalore', salary: '₹30–80L', careersUrl: 'https://www.sarvam.ai/careers', ats: 'ashby', atsSlug: 'sarvam', enabled: true, verified: '2026-07-05' }, // 62 India
  { name: 'ElevenLabs', tier: 'ai', location: 'Remote (India-friendly)', salary: '$80–200K', careersUrl: 'https://elevenlabs.io/careers', ats: 'ashby', atsSlug: 'ElevenLabs', enabled: true, verified: '2026-07-05' }, // 12 India
  { name: 'Glean', tier: 'ai', location: 'Bangalore', salary: '₹30–60L', careersUrl: 'https://www.glean.com/careers', ats: 'greenhouse', atsSlug: 'gleanwork', enabled: true, verified: '2026-07-05' }, // 27 India
  { name: 'Notion', tier: 'ai', location: 'Hyderabad (new), Singapore', salary: '₹30–60L', careersUrl: 'https://www.notion.com/careers', ats: 'ashby', atsSlug: 'notion', enabled: true, verified: '2026-07-05' }, // 5 India

  // ── Product & Cloud ──
  { name: 'Databricks', tier: 'product', location: 'Bangalore', salary: '₹30–50L', careersUrl: 'https://www.databricks.com/company/careers', ats: 'greenhouse', atsSlug: 'databricks', enabled: true, verified: '2026-07-05' }, // 78 India
  { name: 'Snowflake', tier: 'product', location: 'Bangalore, Pune', salary: '₹28–45L', careersUrl: 'https://careers.snowflake.com/', ats: 'ashby', atsSlug: 'snowflake', enabled: true, verified: '2026-07-05' }, // 18 India
  { name: 'MongoDB', tier: 'product', location: 'Gurgaon, Bangalore', salary: '₹25–40L', careersUrl: 'https://www.mongodb.com/company/careers', ats: 'greenhouse', atsSlug: 'mongodb', enabled: true, verified: '2026-07-05' }, // 51 India
  { name: 'Okta', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.okta.com/company/careers/', ats: 'greenhouse', atsSlug: 'okta', enabled: true, verified: '2026-07-05' }, // 107 India!
  { name: 'Elastic', tier: 'product', location: 'Bangalore, Remote', salary: '₹25–40L', careersUrl: 'https://www.elastic.co/about/careers/', ats: 'greenhouse', atsSlug: 'elastic', enabled: true, verified: '2026-07-05' }, // 19 India
  { name: 'Rubrik', tier: 'product', location: 'Bangalore, Pune', salary: '₹28–40L', careersUrl: 'https://www.rubrik.com/company/careers', ats: 'greenhouse', atsSlug: 'rubrik', enabled: true, verified: '2026-07-05' }, // 21 India
  { name: 'Postman', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.postman.com/company/careers/', ats: 'greenhouse', atsSlug: 'postman', enabled: true, verified: '2026-07-05' }, // 17 India
  { name: 'Pure Storage', tier: 'product', location: 'Bangalore, Pune', salary: '₹25–35L', careersUrl: 'https://www.purestorage.com/company/careers.html', ats: 'greenhouse', atsSlug: 'purestorage', enabled: true, verified: '2026-07-05' }, // 68 India
  { name: 'New Relic', tier: 'product', location: 'Bangalore, Hyderabad', salary: '₹22–35L', careersUrl: 'https://newrelic.com/about/careers', ats: 'greenhouse', atsSlug: 'newrelic', enabled: true, verified: '2026-07-05' }, // 16 India
  { name: 'Twilio', tier: 'product', location: 'Bangalore, Remote India', salary: '₹25–40L', careersUrl: 'https://www.twilio.com/en-us/company/jobs', ats: 'greenhouse', atsSlug: 'twilio', enabled: true, verified: '2026-07-05' }, // 21 India
  { name: 'GitLab', tier: 'product', location: 'Remote (India)', salary: '₹25–45L', careersUrl: 'https://about.gitlab.com/jobs/', ats: 'greenhouse', atsSlug: 'gitlab', enabled: true, verified: '2026-07-05' }, // 17 India
  { name: 'Datadog', tier: 'product', location: 'Singapore (India rare)', salary: 'S$100–180K', careersUrl: 'https://careers.datadoghq.com/', ats: 'greenhouse', atsSlug: 'datadog', enabled: true, verified: '2026-07-05' }, // 10 India, 17 SG
  { name: 'Samsara', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.samsara.com/company/careers', ats: 'greenhouse', atsSlug: 'samsara', enabled: true, verified: '2026-07-05' }, // 8 India
  { name: 'Roblox', tier: 'product', location: 'Bangalore', salary: '₹30–50L', careersUrl: 'https://careers.roblox.com/', ats: 'greenhouse', atsSlug: 'roblox', enabled: true, verified: '2026-07-05' }, // 17 India
  { name: 'CockroachDB', tier: 'product', location: 'Bangalore (new)', salary: '₹30–50L', careersUrl: 'https://www.cockroachlabs.com/careers/', ats: 'greenhouse', atsSlug: 'cockroachlabs', enabled: true, verified: '2026-07-05' }, // 5 India
  { name: 'Netskope', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.netskope.com/company/careers', ats: 'greenhouse', atsSlug: 'netskope', enabled: true, verified: '2026-07-05' }, // 13 India
  { name: 'Harness', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.harness.io/company/careers', ats: 'greenhouse', atsSlug: 'harnessinc', enabled: true, verified: '2026-07-05' }, // 25 India
  { name: 'Tekion', tier: 'product', location: 'Bangalore, Chennai', salary: '₹25–40L', careersUrl: 'https://tekion.com/careers', ats: 'greenhouse', atsSlug: 'tekion', enabled: true, verified: '2026-07-05' }, // 39 India
  { name: 'Verkada', tier: 'product', location: 'Bangalore (new)', salary: '₹25–45L', careersUrl: 'https://www.verkada.com/careers/', ats: 'greenhouse', atsSlug: 'verkada', enabled: true, verified: '2026-07-05' },
  { name: 'Flexport', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.flexport.com/careers/', ats: 'greenhouse', atsSlug: 'flexport', enabled: true, verified: '2026-07-05' },
  { name: 'ServiceNow', tier: 'product', location: 'Hyderabad, Bangalore', salary: '₹25–45L', careersUrl: 'https://careers.servicenow.com/', ats: 'smartrecruiters', atsSlug: 'ServiceNow', enabled: true, verified: '2026-07-05' },
  { name: 'Arista Networks', tier: 'product', location: 'Bangalore, Pune', salary: '₹30–50L', careersUrl: 'https://www.arista.com/en/careers', ats: 'smartrecruiters', atsSlug: 'AristaNetworks', enabled: true, verified: '2026-07-05' },
  { name: 'Freshworks', tier: 'product', location: 'Chennai, Bangalore', salary: '₹20–35L', careersUrl: 'https://careers.freshworks.com/', ats: 'smartrecruiters', atsSlug: 'Freshworks', enabled: true, verified: '2026-07-05' }, // 30 India
  { name: 'CrowdStrike', tier: 'product', location: 'Bangalore, Pune', salary: '₹28–45L', careersUrl: 'https://www.crowdstrike.com/careers/', ats: 'workday', atsSlug: 'crowdstrike/wd5/crowdstrikecareers', enabled: true },
  { name: 'Palo Alto Networks', tier: 'product', location: 'Bangalore', salary: '₹28–45L', careersUrl: 'https://jobs.paloaltonetworks.com/', ats: 'workday', atsSlug: 'paloaltonetworks/wd5/panwexternalcareers', enabled: true },
  { name: 'Sprinklr', tier: 'product', location: 'Gurgaon, Bangalore', salary: '₹25–35L', careersUrl: 'https://www.sprinklr.com/careers/', ats: 'workday', atsSlug: 'sprinklr/wd1/careers', enabled: true },
  { name: 'BrowserStack', tier: 'product', location: 'Mumbai (remote)', salary: '₹25–38L', careersUrl: 'https://www.browserstack.com/careers', ats: 'workday', atsSlug: 'browserstack/wd3/External', enabled: true },
  { name: 'Nutanix', tier: 'product', location: 'Bangalore, Pune', salary: '₹25–38L', careersUrl: 'https://www.nutanix.com/company/careers', ats: 'custom', enabled: true },
  { name: 'Confluent', tier: 'product', location: 'Bangalore, Remote', salary: '₹28–45L', careersUrl: 'https://careers.confluent.io/', ats: 'custom', enabled: true },
  { name: 'HashiCorp (IBM)', tier: 'product', location: 'Bangalore, Remote', salary: '₹25–40L', careersUrl: 'https://www.hashicorp.com/careers', ats: 'custom', enabled: true },
  { name: 'Zscaler', tier: 'product', location: 'Bangalore, Hyderabad', salary: '₹25–40L', careersUrl: 'https://www.zscaler.com/careers', ats: 'custom', enabled: true },
  { name: 'Akamai', tier: 'product', location: 'Bangalore', salary: '₹22–35L', careersUrl: 'https://www.akamai.com/careers', ats: 'custom', enabled: true },
  { name: 'Cohesity', tier: 'product', location: 'Bangalore, Pune', salary: '₹25–38L', careersUrl: 'https://www.cohesity.com/company/careers/', ats: 'custom', enabled: true },
  { name: 'Intuit', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.intuit.com/careers/', ats: 'custom', enabled: true },
  { name: 'Media.net', tier: 'product', location: 'Mumbai', salary: '₹25–35L', careersUrl: 'https://www.media.net/careers/', ats: 'custom', enabled: true },
  { name: 'Wise', tier: 'product', location: 'Singapore, Hyderabad (new)', salary: 'S$90–160K', careersUrl: 'https://wise.jobs/', ats: 'custom', enabled: true },
  { name: 'Airwallex', tier: 'product', location: 'Singapore, Bangalore', salary: 'S$90–160K', careersUrl: 'https://careers.airwallex.com/', ats: 'custom', enabled: true },

  // ── Banking & Fintech ──
  { name: 'Goldman Sachs', tier: 'banking', location: 'Bangalore, Singapore', salary: '₹25–40L', careersUrl: 'https://higher.gs.com/roles', ats: 'custom', enabled: true },
  { name: 'Morgan Stanley', tier: 'banking', location: 'Mumbai, Bangalore', salary: '₹22–35L', careersUrl: 'https://www.morganstanley.com/careers', ats: 'custom', enabled: true },
  { name: 'JPMorgan Chase', tier: 'banking', location: 'Hyderabad, Bangalore, Singapore', salary: '₹20–30L', careersUrl: 'https://careers.jpmorgan.com/in/en/students', ats: 'custom', enabled: true },
  { name: 'Visa', tier: 'banking', location: 'Bangalore, Singapore', salary: '₹25–38L', careersUrl: 'https://corporate.visa.com/en/careers.html', ats: 'custom', enabled: true },
  { name: 'Mastercard', tier: 'banking', location: 'Gurgaon, Pune', salary: '₹25–38L', careersUrl: 'https://careers.mastercard.com/', ats: 'custom', enabled: true },
  { name: 'American Express', tier: 'banking', location: 'Gurgaon, Bangalore', salary: '₹22–35L', careersUrl: 'https://aexp.eightfold.ai/careers', ats: 'eightfold', atsSlug: 'aexp', enabled: true },
  { name: 'UBS', tier: 'banking', location: 'Hyderabad, Pune, Singapore', salary: '₹20–32L', careersUrl: 'https://www.ubs.com/global/en/careers.html', ats: 'custom', enabled: true },
  { name: 'Macquarie', tier: 'banking', location: 'Hyderabad, Gurgaon', salary: '₹20–32L', careersUrl: 'https://www.macquarie.com/au/en/careers.html', ats: 'custom', enabled: true },
  { name: 'Deutsche Bank', tier: 'banking', location: 'Bangalore, Pune, Singapore', salary: '₹20–30L', careersUrl: 'https://careers.db.com/', ats: 'custom', enabled: true },
  { name: 'GIC Singapore', tier: 'banking', location: 'Singapore', salary: 'S$100–200K', careersUrl: 'https://www.gic.com.sg/careers/', ats: 'custom', enabled: true },
  { name: 'Coinbase', tier: 'banking', location: 'Remote India, Singapore', salary: '₹35–60L', careersUrl: 'https://www.coinbase.com/careers', ats: 'greenhouse', atsSlug: 'coinbase', enabled: true, verified: '2026-07-05' }, // 7 India, 5 SG
  { name: 'OKX', tier: 'banking', location: 'Singapore', salary: 'S$100–200K', careersUrl: 'https://www.okx.com/careers', ats: 'greenhouse', atsSlug: 'okx', enabled: true, verified: '2026-07-05' }, // 129 SG
  { name: 'Crypto.com', tier: 'banking', location: 'Singapore', salary: 'S$90–180K', careersUrl: 'https://crypto.com/careers', ats: 'lever', atsSlug: 'crypto', enabled: true, verified: '2026-07-05' }, // 28 SG

  // ── Semiconductor / Hardware ──
  { name: 'NVIDIA', tier: 'semi', location: 'Bangalore, Hyderabad, Pune', salary: '₹30–55L', careersUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', ats: 'workday', atsSlug: 'nvidia/wd5/NVIDIAExternalCareerSite', enabled: true },
  { name: 'Samsung', tier: 'semi', location: 'Bangalore (SRI-B), Noida', salary: '₹25–45L', careersUrl: 'https://sec.wd3.myworkdayjobs.com/Samsung_Careers', ats: 'workday', atsSlug: 'sec/wd3/Samsung_Careers', enabled: true },
  { name: 'Qualcomm', tier: 'semi', location: 'Hyderabad, Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.qualcomm.com/careers', ats: 'custom', enabled: true },
  { name: 'AMD', tier: 'semi', location: 'Hyderabad, Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.amd.com/careers-home', ats: 'custom', enabled: true },
  { name: 'ARM', tier: 'semi', location: 'Bangalore, Noida', salary: '₹25–40L', careersUrl: 'https://careers.arm.com/', ats: 'custom', enabled: true },
  { name: 'Broadcom', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹25–40L', careersUrl: 'https://www.broadcom.com/company/careers', ats: 'custom', enabled: true },
  { name: 'Intel', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹22–38L', careersUrl: 'https://jobs.intel.com/', ats: 'custom', enabled: true },
  { name: 'Marvell', tier: 'semi', location: 'Hyderabad, Pune, Singapore', salary: '₹22–35L', careersUrl: 'https://www.marvell.com/company/careers.html', ats: 'custom', enabled: true },
  { name: 'Micron', tier: 'semi', location: 'Hyderabad, Singapore', salary: '₹22–35L', careersUrl: 'https://careers.micron.com/', ats: 'custom', enabled: true },
  { name: 'Synopsys', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹22–35L', careersUrl: 'https://careers.synopsys.com/', ats: 'custom', enabled: true },
  { name: 'Cadence', tier: 'semi', location: 'Noida, Bangalore', salary: '₹22–35L', careersUrl: 'https://www.cadence.com/en_US/home/company/careers.html', ats: 'custom', enabled: true },
  { name: 'Texas Instruments', tier: 'semi', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.ti.com/', ats: 'custom', enabled: true },
  { name: 'Cisco', tier: 'semi', location: 'Bangalore', salary: '₹20–30L', careersUrl: 'https://jobs.cisco.com/', ats: 'custom', enabled: true },
  { name: 'MediaTek', tier: 'semi', location: 'Bangalore, Noida, Singapore', salary: '₹20–35L', careersUrl: 'https://careers.mediatek.com/', ats: 'custom', enabled: true },

  // ── Indian Startups / Scale-ups ──
  { name: 'PhonePe', tier: 'startup', location: 'Bangalore, Pune', salary: '₹25–38L', careersUrl: 'https://www.phonepe.com/careers/', ats: 'greenhouse', atsSlug: 'phonepe', enabled: true, verified: '2026-07-05' }, // 50 India
  { name: 'Razorpay', tier: 'startup', location: 'Bangalore', salary: '₹25–35L', careersUrl: 'https://razorpay.com/jobs/', ats: 'greenhouse', atsSlug: 'razorpaysoftwareprivatelimited', enabled: true, verified: '2026-07-05' }, // 17 India
  { name: 'Paytm', tier: 'startup', location: 'Noida, Bangalore', salary: '₹20–35L', careersUrl: 'https://paytm.com/about-us/careers', ats: 'lever', atsSlug: 'paytm', enabled: true, verified: '2026-07-05' }, // 187 India!
  { name: 'Meesho', tier: 'startup', location: 'Bangalore', salary: '₹25–38L', careersUrl: 'https://www.meesho.io/jobs', ats: 'lever', atsSlug: 'meesho', enabled: true, verified: '2026-07-05' }, // 40 India
  { name: 'Dream11', tier: 'startup', location: 'Mumbai', salary: '₹25–38L', careersUrl: 'https://www.dreamsports.group/careers/', ats: 'lever', atsSlug: 'dreamsports', enabled: true, verified: '2026-07-05' }, // 22 India
  { name: 'CRED', tier: 'startup', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.cred.club/', ats: 'lever', atsSlug: 'cred', enabled: true, verified: '2026-07-05' },
  { name: 'Fi Money', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://fi.money/careers', ats: 'lever', atsSlug: 'epifi', enabled: true, verified: '2026-07-05' },
  { name: 'Groww', tier: 'startup', location: 'Bangalore', salary: '₹25–35L', careersUrl: 'https://groww.in/careers', ats: 'greenhouse', atsSlug: 'groww', enabled: true, verified: '2026-07-05' }, // 15 India
  { name: 'Truecaller', tier: 'startup', location: 'Bangalore', salary: '₹22–35L', careersUrl: 'https://www.truecaller.com/careers', ats: 'greenhouse', atsSlug: 'truecaller', enabled: true, verified: '2026-07-05' },
  { name: 'Ninja Van', tier: 'startup', location: 'Singapore', salary: 'S$70–130K', careersUrl: 'https://www.ninjavan.co/en-sg/careers', ats: 'lever', atsSlug: 'ninjavan', enabled: true, verified: '2026-07-05' }, // 13 SG
  { name: 'Porter', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://porter.in/careers', ats: 'lever', atsSlug: 'porter', enabled: true, verified: '2026-07-05' },
  { name: 'Flipkart', tier: 'startup', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.flipkartcareers.com/', ats: 'custom', enabled: true },
  { name: 'Swiggy', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://careers.swiggy.com/', ats: 'smartrecruiters', atsSlug: 'Swiggy', enabled: true, verified: '2026-07-05' },
  { name: 'Zomato (Eternal)', tier: 'startup', location: 'Gurgaon', salary: '₹20–30L', careersUrl: 'https://www.eternal.com/careers', ats: 'custom', enabled: true },
  { name: 'Zepto', tier: 'startup', location: 'Mumbai, Bangalore', salary: '₹20–35L', careersUrl: 'https://www.zeptonow.com/careers', ats: 'custom', enabled: true },
  { name: 'Zerodha', tier: 'startup', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://zerodha.com/careers/', ats: 'custom', enabled: true },
  { name: 'CoinDCX', tier: 'startup', location: 'Mumbai, Bangalore', salary: '₹20–32L', careersUrl: 'https://careers.coindcx.com/', ats: 'custom', enabled: true },
  { name: 'Navi', tier: 'startup', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://www.navi.com/careers', ats: 'custom', enabled: true },
  { name: 'Juspay', tier: 'startup', location: 'Bangalore', salary: '₹18–30L', careersUrl: 'https://juspay.io/careers', ats: 'custom', enabled: true },
  { name: 'InMobi', tier: 'startup', location: 'Bangalore', salary: '₹22–35L', careersUrl: 'https://www.inmobi.com/company/careers', ats: 'custom', enabled: true },
];

/** Companies with a live, scannable API */
export function scannableCompanies(): Company[] {
  return COMPANIES.filter(c => c.enabled && c.ats !== 'custom');
}

/** Link-only companies (no public API) — still shown in coverage + calendar */
export function customCompanies(): Company[] {
  return COMPANIES.filter(c => c.enabled && c.ats === 'custom');
}
