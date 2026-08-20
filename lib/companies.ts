export type Tier = 'faang' | 'startup' | 'product' | 'ai' | 'quant' | 'banking' | 'semi';
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
  /** Date this board was last confirmed working against the live API */
  verified?: string;
}

// Tier display order == focus order: big tech & startups first.
export const TIER_META: Record<Tier, { label: string; color: string }> = {
  faang:   { label: 'Big Tech',   color: '#3b82f6' },
  startup: { label: 'Startup',    color: '#f97316' },
  product: { label: 'Product',    color: '#22c55e' },
  ai:      { label: 'AI Labs',    color: '#14b8a6' },
  quant:   { label: 'Quant/HFT',  color: '#a855f7' },
  banking: { label: 'Banking',    color: '#eab308' },
  semi:    { label: 'Hardware',   color: '#ef4444' },
};

/**
 * Focus weighting applied to match scores (see lib/matcher.ts).
 * Current priority: big tech + startups first, then product/AI.
 * Quant/banking/hardware are still tracked and scanned, just ranked lower by
 * default — the tier tabs still show them in full.
 */
export const TIER_FOCUS: Record<Tier, number> = {
  faang: 0.12, startup: 0.12, product: 0.06, ai: 0.08,
  quant: -0.05, banking: -0.03, semi: -0.03,
};

// All non-'custom' boards verified against live APIs on the date shown.
// india/sg counts at verification time noted in comments.
export const COMPANIES: Company[] = [
  // ══════════ BIG TECH ══════════
  { name: 'Amazon', tier: 'faang', location: 'Bangalore, Hyderabad, Singapore', salary: '₹30–50L', careersUrl: 'https://www.amazon.jobs/en/search?base_query=software&loc_query=India', ats: 'api', atsSlug: 'amazon', enabled: true, verified: '2026-08-20' },
  { name: 'Microsoft', tier: 'faang', location: 'Hyderabad, Bangalore, Noida', salary: '₹35–55L', careersUrl: 'https://jobs.careers.microsoft.com/global/en/search?lc=India', ats: 'api', atsSlug: 'microsoft', enabled: true },
  // Uber removed the loadSearchJobsResults RPC (ERR_MISSING_HANDLER) — link-only until a new endpoint is found.
  { name: 'Uber', tier: 'faang', location: 'Bangalore, Hyderabad', salary: '₹35–55L', careersUrl: 'https://www.uber.com/us/en/careers/list/?query=&location=IND', ats: 'custom', enabled: true },
  { name: 'Atlassian', tier: 'faang', location: 'Bangalore, Remote India', salary: '₹30–45L', careersUrl: 'https://www.atlassian.com/company/careers/all-jobs', ats: 'api', atsSlug: 'atlassian', enabled: true, verified: '2026-08-20' },
  { name: 'Salesforce', tier: 'faang', location: 'Hyderabad, Bangalore', salary: '₹30–50L', careersUrl: 'https://careers.salesforce.com/', ats: 'workday', atsSlug: 'salesforce/wd12/External_Career_Site', enabled: true, verified: '2026-08-20' }, // 268
  { name: 'eBay', tier: 'faang', location: 'Bangalore', salary: '₹28–45L', careersUrl: 'https://jobs.ebayinc.com/', ats: 'workday', atsSlug: 'ebay/wd5/apply', enabled: true, verified: '2026-08-20' }, // 111 India
  { name: 'Adobe', tier: 'faang', location: 'Noida, Bangalore', salary: '₹25–45L', careersUrl: 'https://adobe.wd5.myworkdayjobs.com/external_experienced', ats: 'workday', atsSlug: 'adobe/wd5/external_experienced', enabled: true, verified: '2026-08-20' }, // 144
  { name: 'Adobe (University)', tier: 'faang', location: 'Noida, Bangalore', salary: '₹25–45L', careersUrl: 'https://adobe.wd5.myworkdayjobs.com/external_university', ats: 'workday', atsSlug: 'adobe/wd5/external_university', enabled: true, verified: '2026-08-20' },
  { name: 'Expedia', tier: 'faang', location: 'Gurgaon, Bangalore', salary: '₹28–45L', careersUrl: 'https://careers.expediagroup.com/jobs/', ats: 'workday', atsSlug: 'expedia/wd108/search', enabled: true, verified: '2026-08-20' }, // 14
  { name: 'Stripe', tier: 'faang', location: 'Bangalore, Singapore', salary: '₹35–60L', careersUrl: 'https://stripe.com/jobs', ats: 'greenhouse', atsSlug: 'stripe', enabled: true, verified: '2026-08-20' }, // 36/28
  { name: 'Airbnb', tier: 'faang', location: 'Bangalore (remote-friendly)', salary: '₹35–60L', careersUrl: 'https://careers.airbnb.com/', ats: 'greenhouse', atsSlug: 'airbnb', enabled: true, verified: '2026-08-20' }, // 11
  { name: 'DoorDash', tier: 'faang', location: 'Pune, Hyderabad', salary: '₹30–50L', careersUrl: 'https://careers.doordash.com/', ats: 'greenhouse', atsSlug: 'doordashusa', enabled: true, verified: '2026-08-20' }, // 9
  { name: 'Figma', tier: 'faang', location: 'Singapore, Remote', salary: 'S$110–190K', careersUrl: 'https://www.figma.com/careers/', ats: 'greenhouse', atsSlug: 'figma', enabled: true, verified: '2026-08-20' }, // 2/7
  { name: 'Cloudflare', tier: 'faang', location: 'Bangalore, Singapore', salary: '₹28–48L', careersUrl: 'https://www.cloudflare.com/careers/', ats: 'greenhouse', atsSlug: 'cloudflare', enabled: true, verified: '2026-08-20' }, // 3
  { name: 'Riot Games', tier: 'faang', location: 'Singapore', salary: 'S$90–160K', careersUrl: 'https://www.riotgames.com/en/work-with-us', ats: 'greenhouse', atsSlug: 'riotgames', enabled: true, verified: '2026-08-20' }, // 20 SG
  { name: 'Waymo', tier: 'faang', location: 'Bangalore (new)', salary: '₹35–60L', careersUrl: 'https://waymo.com/careers/', ats: 'greenhouse', atsSlug: 'waymo', enabled: true, verified: '2026-08-20' }, // 7
  { name: 'Robinhood', tier: 'faang', location: 'Singapore', salary: 'S$110–180K', careersUrl: 'https://careers.robinhood.com/', ats: 'greenhouse', atsSlug: 'robinhood', enabled: true, verified: '2026-08-20' }, // 2 SG
  { name: 'Netflix', tier: 'faang', location: 'Mumbai, Singapore', salary: '₹40–80L', careersUrl: 'https://explore.jobs.netflix.net/careers', ats: 'eightfold', atsSlug: 'netflix', enabled: true, verified: '2026-08-20' },
  // No public API — link-only
  { name: 'Google', tier: 'faang', location: 'Bangalore, Hyderabad, Singapore', salary: '₹40–70L', careersUrl: 'https://www.google.com/about/careers/applications/jobs/results/?location=India', ats: 'custom', enabled: true },
  { name: 'Meta', tier: 'faang', location: 'Gurgaon, Bangalore, Singapore', salary: '₹50–80L', careersUrl: 'https://www.metacareers.com/jobs?offices[0]=Bangalore%2C%20India', ats: 'custom', enabled: true },
  { name: 'Apple', tier: 'faang', location: 'Hyderabad, Bangalore, Singapore', salary: '₹35–55L', careersUrl: 'https://jobs.apple.com/en-in/search?location=india-INDC', ats: 'custom', enabled: true },
  { name: 'LinkedIn', tier: 'faang', location: 'Bangalore', salary: '₹30–50L', careersUrl: 'https://careers.linkedin.com/', ats: 'custom', enabled: true },
  { name: 'TikTok / ByteDance', tier: 'faang', location: 'Singapore', salary: 'S$100–180K', careersUrl: 'https://lifeattiktok.com/search?location=Singapore', ats: 'custom', enabled: true },
  { name: 'Sea (Shopee/Garena)', tier: 'faang', location: 'Singapore', salary: 'S$80–150K', careersUrl: 'https://career.sea.com/', ats: 'custom', enabled: true },
  { name: 'Grab', tier: 'faang', location: 'Singapore, Bangalore', salary: 'S$80–150K', careersUrl: 'https://www.grab.careers/en/jobs/', ats: 'custom', enabled: true },
  { name: 'Cisco', tier: 'faang', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://jobs.cisco.com/jobs/SearchJobs/india', ats: 'custom', enabled: true },
  { name: 'IBM', tier: 'faang', location: 'Bangalore, Pune, Hyderabad', salary: '₹15–30L', careersUrl: 'https://www.ibm.com/careers/search?field_keyword_05[0]=India', ats: 'custom', enabled: true },
  { name: 'Oracle', tier: 'faang', location: 'Bangalore, Hyderabad', salary: '₹20–35L', careersUrl: 'https://careers.oracle.com/jobs/', ats: 'custom', enabled: true },
  { name: 'SAP Labs India', tier: 'faang', location: 'Bangalore, Pune', salary: '₹20–35L', careersUrl: 'https://jobs.sap.com/search/?q=&locationsearch=India', ats: 'custom', enabled: true },
  { name: 'PayPal', tier: 'faang', location: 'Chennai, Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.pypl.com/search-results', ats: 'custom', enabled: true },
  { name: 'Booking.com', tier: 'faang', location: 'Bangalore', salary: '₹28–45L', careersUrl: 'https://jobs.booking.com/careers', ats: 'custom', enabled: true },
  { name: 'Agoda', tier: 'faang', location: 'Singapore, Bangkok, Gurgaon', salary: 'S$80–150K', careersUrl: 'https://careers.agoda.com/', ats: 'custom', enabled: true },

  // ══════════ INDIAN STARTUPS / SCALE-UPS ══════════
  { name: 'Paytm', tier: 'startup', location: 'Noida, Bangalore', salary: '₹20–35L', careersUrl: 'https://paytm.com/careers', ats: 'lever', atsSlug: 'paytm', enabled: true, verified: '2026-08-20' }, // 187 India
  { name: 'PhonePe', tier: 'startup', location: 'Bangalore, Pune', salary: '₹25–38L', careersUrl: 'https://www.phonepe.com/careers/', ats: 'greenhouse', atsSlug: 'phonepe', enabled: true, verified: '2026-08-20' }, // 50
  { name: 'Meesho', tier: 'startup', location: 'Bangalore', salary: '₹25–38L', careersUrl: 'https://www.meesho.io/jobs', ats: 'lever', atsSlug: 'meesho', enabled: true, verified: '2026-08-20' }, // 40
  { name: 'Razorpay', tier: 'startup', location: 'Bangalore', salary: '₹25–35L', careersUrl: 'https://razorpay.com/jobs/', ats: 'greenhouse', atsSlug: 'razorpaysoftwareprivatelimited', enabled: true, verified: '2026-08-20' }, // 17
  { name: 'Zeta', tier: 'startup', location: 'Bangalore, Hyderabad', salary: '₹25–40L', careersUrl: 'https://www.zeta.tech/careers', ats: 'lever', atsSlug: 'zeta', enabled: true, verified: '2026-08-20' }, // 22 India
  { name: 'DevRev', tier: 'startup', location: 'Bangalore, Chennai', salary: '₹25–45L', careersUrl: 'https://devrev.ai/careers', ats: 'greenhouse', atsSlug: 'devrev', enabled: true, verified: '2026-08-20' }, // 20 India
  { name: 'Tide', tier: 'startup', location: 'Hyderabad, Delhi', salary: '₹20–35L', careersUrl: 'https://www.tide.co/careers/', ats: 'greenhouse', atsSlug: 'tide', enabled: true, verified: '2026-08-20' }, // 26 India
  { name: 'Druva', tier: 'startup', location: 'Pune, Bangalore', salary: '₹22–38L', careersUrl: 'https://www.druva.com/about/careers', ats: 'greenhouse', atsSlug: 'druva', enabled: true, verified: '2026-08-20' }, // 15 India
  { name: 'Turing', tier: 'startup', location: 'Remote India', salary: '₹25–45L', careersUrl: 'https://www.turing.com/careers', ats: 'greenhouse', atsSlug: 'turing', enabled: true, verified: '2026-08-20' }, // 8 India
  { name: 'Atlan', tier: 'startup', location: 'Remote India, Delhi', salary: '₹25–40L', careersUrl: 'https://atlan.com/careers/', ats: 'ashby', atsSlug: 'atlan', enabled: true, verified: '2026-08-20' }, // 5 India
  { name: 'Tekion', tier: 'startup', location: 'Bangalore, Chennai', salary: '₹25–40L', careersUrl: 'https://tekion.com/careers', ats: 'custom', enabled: true }, // greenhouse board retired
  { name: 'Dream11', tier: 'startup', location: 'Mumbai', salary: '₹25–38L', careersUrl: 'https://www.dreamsports.group/careers/', ats: 'custom', enabled: true }, // lever board retired
  { name: 'CRED', tier: 'startup', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.cred.club/', ats: 'lever', atsSlug: 'cred', enabled: true, verified: '2026-08-20' },
  { name: 'Groww', tier: 'startup', location: 'Bangalore', salary: '₹25–35L', careersUrl: 'https://groww.in/careers', ats: 'greenhouse', atsSlug: 'groww', enabled: true, verified: '2026-08-20' }, // 15
  { name: 'Fi Money', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://fi.money/careers', ats: 'lever', atsSlug: 'epifi', enabled: true, verified: '2026-08-20' },
  { name: 'Truecaller', tier: 'startup', location: 'Bangalore', salary: '₹22–35L', careersUrl: 'https://www.truecaller.com/careers', ats: 'greenhouse', atsSlug: 'truecaller', enabled: true, verified: '2026-08-20' },
  { name: 'Swiggy', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://careers.swiggy.com/', ats: 'smartrecruiters', atsSlug: 'Swiggy', enabled: true, verified: '2026-08-20' },
  { name: 'Porter', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://porter.in/careers', ats: 'lever', atsSlug: 'porter', enabled: true, verified: '2026-08-20' },
  { name: 'Ninja Van', tier: 'startup', location: 'Singapore', salary: 'S$70–130K', careersUrl: 'https://www.ninjavan.co/en-sg/careers', ats: 'lever', atsSlug: 'ninjavan', enabled: true, verified: '2026-08-20' }, // 13 SG
  // No public API — link-only (Darwinbox / TurboHire / Keka / bespoke portals)
  { name: 'Flipkart', tier: 'startup', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.flipkartcareers.com/', ats: 'custom', enabled: true },
  { name: 'Zomato (Eternal)', tier: 'startup', location: 'Gurgaon', salary: '₹20–30L', careersUrl: 'https://www.eternal.com/careers', ats: 'custom', enabled: true },
  { name: 'Zepto', tier: 'startup', location: 'Mumbai, Bangalore', salary: '₹20–35L', careersUrl: 'https://www.zeptonow.com/careers', ats: 'custom', enabled: true },
  { name: 'Navi', tier: 'startup', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://navi.com/careers', ats: 'custom', enabled: true },
  { name: 'Zerodha', tier: 'startup', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://zerodha.com/careers/', ats: 'custom', enabled: true },
  { name: 'Unacademy', tier: 'startup', location: 'Bangalore', salary: '₹18–30L', careersUrl: 'https://unacademy.com/careers', ats: 'custom', enabled: true },
  { name: 'Ola / Krutrim', tier: 'startup', location: 'Bangalore', salary: '₹20–40L', careersUrl: 'https://www.olakrutrim.com/careers', ats: 'custom', enabled: true },
  { name: 'Lenskart', tier: 'startup', location: 'Gurgaon, Bangalore', salary: '₹18–32L', careersUrl: 'https://www.lenskart.com/careers', ats: 'custom', enabled: true },
  { name: 'Urban Company', tier: 'startup', location: 'Gurgaon', salary: '₹20–35L', careersUrl: 'https://www.urbancompany.com/careers', ats: 'custom', enabled: true },
  { name: 'Juspay', tier: 'startup', location: 'Bangalore', salary: '₹18–30L', careersUrl: 'https://juspay.io/careers', ats: 'custom', enabled: true },
  { name: 'InMobi', tier: 'startup', location: 'Bangalore', salary: '₹22–35L', careersUrl: 'https://www.inmobi.com/company/careers', ats: 'custom', enabled: true },
  { name: 'CoinDCX', tier: 'startup', location: 'Mumbai, Bangalore', salary: '₹20–32L', careersUrl: 'https://careers.coindcx.com/', ats: 'custom', enabled: true },
  { name: 'Delhivery', tier: 'startup', location: 'Gurgaon, Bangalore', salary: '₹18–30L', careersUrl: 'https://www.delhivery.com/careers/', ats: 'custom', enabled: true },
  { name: 'Sprinto', tier: 'startup', location: 'Remote India', salary: '₹18–32L', careersUrl: 'https://sprinto.com/careers/', ats: 'custom', enabled: true },
  { name: 'Whatfix', tier: 'startup', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://whatfix.com/careers/', ats: 'custom', enabled: true },
  { name: 'MoEngage', tier: 'startup', location: 'Bangalore', salary: '₹20–35L', careersUrl: 'https://www.moengage.com/careers/', ats: 'custom', enabled: true },
  { name: 'Darwinbox', tier: 'startup', location: 'Hyderabad', salary: '₹18–30L', careersUrl: 'https://darwinbox.com/careers', ats: 'custom', enabled: true },
  { name: 'Zetwerk', tier: 'startup', location: 'Bangalore', salary: '₹20–32L', careersUrl: 'https://www.zetwerk.com/careers/', ats: 'custom', enabled: true },

  // ══════════ PRODUCT & CLOUD ══════════
  { name: 'Okta', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.okta.com/company/careers/', ats: 'greenhouse', atsSlug: 'okta', enabled: true, verified: '2026-08-20' }, // 107 India
  { name: 'Databricks', tier: 'product', location: 'Bangalore', salary: '₹30–50L', careersUrl: 'https://www.databricks.com/company/careers', ats: 'greenhouse', atsSlug: 'databricks', enabled: true, verified: '2026-08-20' }, // 78
  { name: 'Pure Storage', tier: 'product', location: 'Bangalore, Pune', salary: '₹25–35L', careersUrl: 'https://www.purestorage.com/company/careers.html', ats: 'greenhouse', atsSlug: 'purestorage', enabled: true, verified: '2026-08-20' }, // 68
  { name: 'MongoDB', tier: 'product', location: 'Gurgaon, Bangalore', salary: '₹25–40L', careersUrl: 'https://www.mongodb.com/company/careers', ats: 'greenhouse', atsSlug: 'mongodb', enabled: true, verified: '2026-08-20' }, // 51
  { name: 'NICE', tier: 'product', location: 'Pune, Bangalore', salary: '₹20–35L', careersUrl: 'https://www.nice.com/careers', ats: 'greenhouse', atsSlug: 'nice', enabled: true, verified: '2026-08-20' }, // 35 India
  { name: 'Palo Alto Networks', tier: 'product', location: 'Bangalore', salary: '₹28–45L', careersUrl: 'https://jobs.paloaltonetworks.com/', ats: 'workday', atsSlug: 'paloaltonetworks/wd5/panwexternalcareers', enabled: true, verified: '2026-08-20' }, // 172
  { name: 'CrowdStrike', tier: 'product', location: 'Bangalore, Pune', salary: '₹28–45L', careersUrl: 'https://www.crowdstrike.com/careers/', ats: 'workday', atsSlug: 'crowdstrike/wd5/crowdstrikecareers', enabled: true, verified: '2026-08-20' }, // 60
  { name: 'Sprinklr', tier: 'product', location: 'Gurgaon, Bangalore', salary: '₹25–35L', careersUrl: 'https://www.sprinklr.com/careers/', ats: 'workday', atsSlug: 'sprinklr/wd1/careers', enabled: true, verified: '2026-08-20' }, // 36
  { name: 'BrowserStack', tier: 'product', location: 'Mumbai (remote)', salary: '₹25–38L', careersUrl: 'https://www.browserstack.com/careers', ats: 'workday', atsSlug: 'browserstack/wd3/External', enabled: true, verified: '2026-08-20' }, // 31
  { name: 'Autodesk', tier: 'product', location: 'Bangalore, Pune', salary: '₹25–40L', careersUrl: 'https://www.autodesk.com/careers/overview', ats: 'workday', atsSlug: 'autodesk/wd1/Ext', enabled: true, verified: '2026-08-20' }, // 52
  { name: 'Zendesk', tier: 'product', location: 'Pune, Bangalore', salary: '₹22–38L', careersUrl: 'https://jobs.zendesk.com/', ats: 'workday', atsSlug: 'zendesk/wd1/zendesk', enabled: true, verified: '2026-08-20' }, // 13
  { name: 'Red Hat', tier: 'product', location: 'Pune, Bangalore', salary: '₹20–35L', careersUrl: 'https://www.redhat.com/en/jobs', ats: 'workday', atsSlug: 'redhat/wd5/Jobs', enabled: true, verified: '2026-08-20' },
  { name: 'Fivetran', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.fivetran.com/careers', ats: 'greenhouse', atsSlug: 'fivetran', enabled: true, verified: '2026-08-20' }, // 22 India
  { name: 'ClickHouse', tier: 'product', location: 'Remote India, Singapore', salary: '₹30–55L', careersUrl: 'https://clickhouse.com/company/careers', ats: 'greenhouse', atsSlug: 'clickhouse', enabled: true, verified: '2026-08-20' }, // 11/7
  { name: 'Snowflake', tier: 'product', location: 'Bangalore, Pune', salary: '₹28–45L', careersUrl: 'https://careers.snowflake.com/', ats: 'ashby', atsSlug: 'snowflake', enabled: true, verified: '2026-08-20' }, // 18
  { name: 'Elastic', tier: 'product', location: 'Bangalore, Remote', salary: '₹25–40L', careersUrl: 'https://www.elastic.co/about/careers/', ats: 'greenhouse', atsSlug: 'elastic', enabled: true, verified: '2026-08-20' }, // 19
  { name: 'Rubrik', tier: 'product', location: 'Bangalore, Pune', salary: '₹28–40L', careersUrl: 'https://www.rubrik.com/company/careers', ats: 'greenhouse', atsSlug: 'rubrik', enabled: true, verified: '2026-08-20' }, // 21
  { name: 'Postman', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.postman.com/company/careers/', ats: 'greenhouse', atsSlug: 'postman', enabled: true, verified: '2026-08-20' }, // 17
  { name: 'Twilio', tier: 'product', location: 'Bangalore, Remote India', salary: '₹25–40L', careersUrl: 'https://www.twilio.com/en-us/company/jobs', ats: 'greenhouse', atsSlug: 'twilio', enabled: true, verified: '2026-08-20' }, // 21
  { name: 'GitLab', tier: 'product', location: 'Remote (India)', salary: '₹25–45L', careersUrl: 'https://about.gitlab.com/jobs/', ats: 'greenhouse', atsSlug: 'gitlab', enabled: true, verified: '2026-08-20' }, // 17
  { name: 'Roblox', tier: 'product', location: 'Bangalore', salary: '₹30–50L', careersUrl: 'https://careers.roblox.com/', ats: 'greenhouse', atsSlug: 'roblox', enabled: true, verified: '2026-08-20' }, // 17
  { name: 'New Relic', tier: 'product', location: 'Bangalore, Hyderabad', salary: '₹22–35L', careersUrl: 'https://newrelic.com/about/careers', ats: 'greenhouse', atsSlug: 'newrelic', enabled: true, verified: '2026-08-20' }, // 16
  { name: 'Netskope', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.netskope.com/company/careers', ats: 'greenhouse', atsSlug: 'netskope', enabled: true, verified: '2026-08-20' }, // 13
  { name: 'Harness', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.harness.io/company/careers', ats: 'greenhouse', atsSlug: 'harnessinc', enabled: true, verified: '2026-08-20' }, // 25
  { name: 'Samsara', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.samsara.com/company/careers', ats: 'greenhouse', atsSlug: 'samsara', enabled: true, verified: '2026-08-20' }, // 8
  { name: 'Sumo Logic', tier: 'product', location: 'Bangalore, Noida', salary: '₹22–35L', careersUrl: 'https://www.sumologic.com/careers/', ats: 'greenhouse', atsSlug: 'sumologic', enabled: true, verified: '2026-08-20' }, // 8 India
  { name: 'Yugabyte', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.yugabyte.com/careers/', ats: 'greenhouse', atsSlug: 'yugabyte', enabled: true, verified: '2026-08-20' }, // 6 India
  { name: 'Starburst', tier: 'product', location: 'Remote India', salary: '₹25–40L', careersUrl: 'https://www.starburst.io/careers/', ats: 'greenhouse', atsSlug: 'starburst', enabled: true, verified: '2026-08-20' }, // 4 India
  { name: 'Temporal', tier: 'product', location: 'Remote India', salary: '₹28–45L', careersUrl: 'https://temporal.io/careers', ats: 'greenhouse', atsSlug: 'temporaltechnologies', enabled: true, verified: '2026-08-20' }, // 2 India
  { name: 'Vercel', tier: 'product', location: 'Remote India', salary: '₹28–50L', careersUrl: 'https://vercel.com/careers', ats: 'greenhouse', atsSlug: 'vercel', enabled: true, verified: '2026-08-20' }, // 3 India
  { name: 'Amplitude', tier: 'product', location: 'Remote India, Singapore', salary: '₹25–40L', careersUrl: 'https://amplitude.com/careers', ats: 'greenhouse', atsSlug: 'amplitude', enabled: true, verified: '2026-08-20' },
  { name: 'Grafana Labs', tier: 'product', location: 'Remote India', salary: '₹25–45L', careersUrl: 'https://grafana.com/about/careers/', ats: 'greenhouse', atsSlug: 'grafanalabs', enabled: true, verified: '2026-08-20' },
  { name: 'Mixpanel', tier: 'product', location: 'Singapore, Remote', salary: 'S$90–150K', careersUrl: 'https://mixpanel.com/careers/', ats: 'greenhouse', atsSlug: 'mixpanel', enabled: true, verified: '2026-08-20' }, // 6 SG
  { name: 'Klaviyo', tier: 'product', location: 'Singapore', salary: 'S$90–150K', careersUrl: 'https://www.klaviyo.com/careers', ats: 'greenhouse', atsSlug: 'klaviyo', enabled: true, verified: '2026-08-20' }, // 6 SG
  { name: 'Braze', tier: 'product', location: 'Singapore', salary: 'S$90–150K', careersUrl: 'https://www.braze.com/careers', ats: 'greenhouse', atsSlug: 'braze', enabled: true, verified: '2026-08-20' }, // 4 SG
  { name: 'Fastly', tier: 'product', location: 'Singapore, Remote India', salary: 'S$90–150K', careersUrl: 'https://www.fastly.com/about/careers', ats: 'greenhouse', atsSlug: 'fastly', enabled: true, verified: '2026-08-20' }, // 2/5
  { name: 'Remote.com', tier: 'product', location: 'Remote (global)', salary: '$60–120K', careersUrl: 'https://remote.com/careers', ats: 'greenhouse', atsSlug: 'remotecom', enabled: true, verified: '2026-08-20' },
  { name: 'ServiceNow', tier: 'product', location: 'Hyderabad, Bangalore', salary: '₹25–45L', careersUrl: 'https://careers.servicenow.com/', ats: 'smartrecruiters', atsSlug: 'ServiceNow', enabled: true, verified: '2026-08-20' },
  { name: 'Arista Networks', tier: 'product', location: 'Bangalore, Pune', salary: '₹30–50L', careersUrl: 'https://www.arista.com/en/careers', ats: 'smartrecruiters', atsSlug: 'AristaNetworks', enabled: true, verified: '2026-08-20' },
  { name: 'Freshworks', tier: 'product', location: 'Chennai, Bangalore', salary: '₹20–35L', careersUrl: 'https://careers.freshworks.com/', ats: 'smartrecruiters', atsSlug: 'Freshworks', enabled: true, verified: '2026-08-20' },
  { name: 'Nutanix', tier: 'product', location: 'Bangalore, Pune', salary: '₹25–38L', careersUrl: 'https://www.nutanix.com/company/careers', ats: 'custom', enabled: true },
  { name: 'Confluent', tier: 'product', location: 'Bangalore, Remote', salary: '₹28–45L', careersUrl: 'https://careers.confluent.io/', ats: 'custom', enabled: true },
  { name: 'Zscaler', tier: 'product', location: 'Bangalore, Hyderabad', salary: '₹25–40L', careersUrl: 'https://www.zscaler.com/careers', ats: 'custom', enabled: true },
  { name: 'Akamai', tier: 'product', location: 'Bangalore', salary: '₹22–35L', careersUrl: 'https://www.akamai.com/careers', ats: 'custom', enabled: true },
  { name: 'Splunk', tier: 'product', location: 'Hyderabad, Bangalore', salary: '₹25–40L', careersUrl: 'https://www.splunk.com/en_us/careers.html', ats: 'custom', enabled: true },
  { name: 'Intuit', tier: 'product', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://www.intuit.com/careers/', ats: 'custom', enabled: true },
  { name: 'Media.net', tier: 'product', location: 'Mumbai', salary: '₹25–35L', careersUrl: 'https://www.media.net/careers/', ats: 'custom', enabled: true },
  { name: 'Airwallex', tier: 'product', location: 'Singapore, Bangalore', salary: 'S$90–160K', careersUrl: 'https://careers.airwallex.com/', ats: 'custom', enabled: true },

  // ══════════ AI LABS ══════════
  { name: 'OpenAI', tier: 'ai', location: 'Singapore, Bangalore (new)', salary: 'S$200–400K', careersUrl: 'https://openai.com/careers/', ats: 'ashby', atsSlug: 'openai', enabled: true, verified: '2026-08-20' }, // 9/31
  { name: 'Anthropic', tier: 'ai', location: 'Bangalore (new), Singapore', salary: 'S$250–450K', careersUrl: 'https://www.anthropic.com/careers', ats: 'greenhouse', atsSlug: 'anthropic', enabled: true, verified: '2026-08-20' }, // 3/7
  { name: 'Sarvam AI', tier: 'ai', location: 'Bangalore', salary: '₹30–80L', careersUrl: 'https://www.sarvam.ai/careers', ats: 'ashby', atsSlug: 'sarvam', enabled: true, verified: '2026-08-20' }, // 62 India
  { name: 'Glean', tier: 'ai', location: 'Bangalore', salary: '₹30–60L', careersUrl: 'https://www.glean.com/careers', ats: 'greenhouse', atsSlug: 'gleanwork', enabled: true, verified: '2026-08-20' }, // 27
  { name: 'Harvey', tier: 'ai', location: 'Bangalore (new), Singapore', salary: '₹35–70L', careersUrl: 'https://www.harvey.ai/careers', ats: 'ashby', atsSlug: 'harvey', enabled: true, verified: '2026-08-20' }, // 8/4
  { name: 'Sierra', tier: 'ai', location: 'Singapore', salary: 'S$150–280K', careersUrl: 'https://sierra.ai/careers', ats: 'ashby', atsSlug: 'sierra', enabled: true, verified: '2026-08-20' }, // 11 SG
  { name: 'Fireworks AI', tier: 'ai', location: 'Singapore, Remote', salary: 'S$120–250K', careersUrl: 'https://fireworks.ai/careers', ats: 'ashby', atsSlug: 'fireworks', enabled: true, verified: '2026-08-20' }, // 4 SG
  { name: 'ElevenLabs', tier: 'ai', location: 'Remote (India-friendly)', salary: '$80–200K', careersUrl: 'https://elevenlabs.io/careers', ats: 'ashby', atsSlug: 'ElevenLabs', enabled: true, verified: '2026-08-20' }, // 12
  { name: 'Notion', tier: 'ai', location: 'Hyderabad (new), Singapore', salary: '₹30–60L', careersUrl: 'https://www.notion.com/careers', ats: 'ashby', atsSlug: 'notion', enabled: true, verified: '2026-08-20' }, // 5
  { name: 'Scale AI', tier: 'ai', location: 'Remote India', salary: '₹30–60L', careersUrl: 'https://scale.com/careers', ats: 'greenhouse', atsSlug: 'scaleai', enabled: true, verified: '2026-08-20' },
  { name: 'Neon', tier: 'ai', location: 'Remote India', salary: '₹28–50L', careersUrl: 'https://neon.tech/careers', ats: 'ashby', atsSlug: 'neon', enabled: true, verified: '2026-08-20' },
  { name: 'Perplexity', tier: 'ai', location: 'Remote, Singapore', salary: '$100–250K', careersUrl: 'https://www.perplexity.ai/careers', ats: 'ashby', atsSlug: 'perplexity', enabled: true, verified: '2026-08-20' },

  // ══════════ QUANT / HFT ══════════
  { name: 'Squarepoint Capital', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹50L–1Cr', careersUrl: 'https://www.squarepoint-capital.com/careers', ats: 'greenhouse', atsSlug: 'squarepointcapital', enabled: true, verified: '2026-08-20' }, // 26/39
  { name: 'Point72 / Cubist', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹50L–1.2Cr', careersUrl: 'https://careers.point72.com/', ats: 'greenhouse', atsSlug: 'point72', enabled: true, verified: '2026-08-20' }, // 44/18
  { name: 'Millennium', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹60L–1.5Cr', careersUrl: 'https://www.mlp.com/current-opportunities/', ats: 'eightfold', atsSlug: 'mlp', enabled: true, verified: '2026-08-20' }, // 46
  { name: 'Tower Research Capital', tier: 'quant', location: 'Gurgaon, Singapore', salary: '₹70L–1.5Cr', careersUrl: 'https://www.tower-research.com/open-positions', ats: 'greenhouse', atsSlug: 'towerresearchcapital', enabled: true, verified: '2026-08-20' }, // 13/17
  { name: 'Graviton Research Capital', tier: 'quant', location: 'Gurgaon', salary: '₹80L–1.5Cr', careersUrl: 'https://gravitonresearch.com/careers/', ats: 'greenhouse', atsSlug: 'gravitonresearchcapital', enabled: true, verified: '2026-08-20' }, // 13
  { name: 'Qube Research & Technologies', tier: 'quant', location: 'Mumbai, Singapore', salary: '₹60L–1.2Cr', careersUrl: 'https://www.qube-rt.com/careers/', ats: 'greenhouse', atsSlug: 'quberesearchandtechnologies', enabled: true, verified: '2026-08-20' }, // 8/13
  { name: 'Jane Street', tier: 'quant', location: 'Hong Kong, Singapore', salary: 'S$200–400K', careersUrl: 'https://www.janestreet.com/join-jane-street/open-roles/', ats: 'greenhouse', atsSlug: 'janestreet', enabled: true, verified: '2026-08-20' }, // 14 SG
  { name: 'Hudson River Trading', tier: 'quant', location: 'Singapore', salary: 'S$250–450K', careersUrl: 'https://www.hudsonrivertrading.com/careers/', ats: 'greenhouse', atsSlug: 'wehrtyou', enabled: true, verified: '2026-08-20' }, // 20 SG
  { name: 'Jump Trading', tier: 'quant', location: 'Singapore', salary: 'S$250–450K', careersUrl: 'https://www.jumptrading.com/careers/', ats: 'greenhouse', atsSlug: 'jumptrading', enabled: true, verified: '2026-08-20' }, // 11 SG
  { name: 'DRW', tier: 'quant', location: 'Singapore', salary: 'S$200–400K', careersUrl: 'https://www.drw.com/work-at-drw', ats: 'greenhouse', atsSlug: 'drweng', enabled: true, verified: '2026-08-20' }, // 15 SG
  { name: 'Optiver', tier: 'quant', location: 'Mumbai, Singapore', salary: '₹70L–1.5Cr', careersUrl: 'https://optiver.com/working-at-optiver/career-opportunities/', ats: 'greenhouse', atsSlug: 'optiverus', enabled: true, verified: '2026-08-20' }, // 3/8
  { name: 'IMC Trading', tier: 'quant', location: 'Mumbai', salary: '₹60L–1.2Cr', careersUrl: 'https://careers.imc.com/', ats: 'greenhouse', atsSlug: 'imc', enabled: true, verified: '2026-08-20' }, // 12
  { name: 'Virtu Financial', tier: 'quant', location: 'Singapore', salary: 'S$150–300K', careersUrl: 'https://www.virtu.com/careers/', ats: 'greenhouse', atsSlug: 'virtu', enabled: true, verified: '2026-08-20' }, // 11 SG
  { name: 'XTX Markets', tier: 'quant', location: 'Singapore, Mumbai', salary: 'S$200–400K', careersUrl: 'https://www.xtxmarkets.com/careers/', ats: 'greenhouse', atsSlug: 'xtxmarketstechnologies', enabled: true, verified: '2026-08-20' },
  { name: 'Flow Traders', tier: 'quant', location: 'Singapore', salary: 'S$150–300K', careersUrl: 'https://www.flowtraders.com/careers', ats: 'greenhouse', atsSlug: 'flowtraders', enabled: true, verified: '2026-08-20' },
  { name: 'WorldQuant', tier: 'quant', location: 'Mumbai, Singapore, Remote', salary: '₹30–80L', careersUrl: 'https://www.worldquant.com/career-listing/', ats: 'greenhouse', atsSlug: 'worldquant', enabled: true, verified: '2026-08-20' }, // 6
  { name: 'DE Shaw India', tier: 'quant', location: 'Hyderabad, Bangalore', salary: '₹40–80L', careersUrl: 'https://www.deshawindia.com/careers', ats: 'custom', enabled: true },
  { name: 'Citadel Securities', tier: 'quant', location: 'Gurgaon', salary: '₹80L–1.5Cr', careersUrl: 'https://www.citadelsecurities.com/careers/open-opportunities/', ats: 'custom', enabled: true },
  { name: 'Two Sigma', tier: 'quant', location: 'Mumbai', salary: '₹70L–1.2Cr', careersUrl: 'https://careers.twosigma.com/', ats: 'custom', enabled: true },
  { name: 'SIG (Susquehanna)', tier: 'quant', location: 'Mumbai', salary: '₹60L–1.2Cr', careersUrl: 'https://careers.sig.com/', ats: 'custom', enabled: true },
  { name: 'Quadeye Securities', tier: 'quant', location: 'Gurgaon', salary: '₹35–70L', careersUrl: 'https://quadeye.com/careers/', ats: 'custom', enabled: true },
  { name: 'AlphaGrep Securities', tier: 'quant', location: 'Mumbai', salary: '₹40–80L', careersUrl: 'https://www.alphagrep.com/careers.html', ats: 'custom', enabled: true },
  { name: 'NK Securities Research', tier: 'quant', location: 'Gurgaon', salary: '₹50L–1Cr', careersUrl: 'https://www.nksecurities.com/', ats: 'custom', enabled: true },
  { name: 'QuantBox Research', tier: 'quant', location: 'Bangalore, Singapore', salary: '₹50L–1Cr', careersUrl: 'https://www.quantbox.in/', ats: 'custom', enabled: true },
  { name: 'iRage Capital', tier: 'quant', location: 'Mumbai', salary: '₹30–60L', careersUrl: 'https://iragecapital.com/careers/', ats: 'custom', enabled: true },

  // ══════════ BANKING & FINTECH ══════════
  { name: 'Citi', tier: 'banking', location: 'Pune, Chennai, Mumbai', salary: '₹18–32L', careersUrl: 'https://jobs.citi.com/', ats: 'workday', atsSlug: 'citi/wd5/2', enabled: true, verified: '2026-08-20' }, // 1032!
  { name: 'Deutsche Bank', tier: 'banking', location: 'Bangalore, Pune, Singapore', salary: '₹20–30L', careersUrl: 'https://careers.db.com/', ats: 'workday', atsSlug: 'db/wd3/DBWebsite', enabled: true, verified: '2026-08-20' }, // 256
  { name: 'HSBC', tier: 'banking', location: 'Hyderabad, Pune, Bangalore', salary: '₹18–30L', careersUrl: 'https://www.hsbc.com/careers', ats: 'eightfold', atsSlug: 'hsbc', enabled: true, verified: '2026-08-20' }, // 178
  { name: 'Coinbase', tier: 'banking', location: 'Remote India, Singapore', salary: '₹35–60L', careersUrl: 'https://www.coinbase.com/careers', ats: 'greenhouse', atsSlug: 'coinbase', enabled: true, verified: '2026-08-20' }, // 7/5
  { name: 'OKX', tier: 'banking', location: 'Singapore', salary: 'S$100–200K', careersUrl: 'https://www.okx.com/careers', ats: 'greenhouse', atsSlug: 'okx', enabled: true, verified: '2026-08-20' }, // 129 SG
  { name: 'Crypto.com', tier: 'banking', location: 'Singapore', salary: 'S$90–180K', careersUrl: 'https://crypto.com/careers', ats: 'lever', atsSlug: 'crypto', enabled: true, verified: '2026-08-20' }, // 28 SG
  { name: 'Adyen', tier: 'banking', location: 'Singapore, Remote', salary: 'S$90–160K', careersUrl: 'https://careers.adyen.com/', ats: 'greenhouse', atsSlug: 'adyen', enabled: true, verified: '2026-08-20' }, // 7/12
  { name: 'Goldman Sachs', tier: 'banking', location: 'Bangalore, Singapore', salary: '₹25–40L', careersUrl: 'https://higher.gs.com/roles', ats: 'custom', enabled: true },
  { name: 'Morgan Stanley', tier: 'banking', location: 'Mumbai, Bangalore', salary: '₹22–35L', careersUrl: 'https://www.morganstanley.com/careers', ats: 'custom', enabled: true },
  { name: 'JPMorgan Chase', tier: 'banking', location: 'Hyderabad, Bangalore, Singapore', salary: '₹20–30L', careersUrl: 'https://careers.jpmorgan.com/in/en/students', ats: 'custom', enabled: true },
  { name: 'Visa', tier: 'banking', location: 'Bangalore, Singapore', salary: '₹25–38L', careersUrl: 'https://corporate.visa.com/en/careers.html', ats: 'custom', enabled: true },
  { name: 'Mastercard', tier: 'banking', location: 'Gurgaon, Pune', salary: '₹25–38L', careersUrl: 'https://careers.mastercard.com/', ats: 'custom', enabled: true },
  { name: 'American Express', tier: 'banking', location: 'Gurgaon, Bangalore', salary: '₹22–35L', careersUrl: 'https://www.americanexpress.com/en-us/careers/', ats: 'custom', enabled: true },
  { name: 'UBS', tier: 'banking', location: 'Hyderabad, Pune, Singapore', salary: '₹20–32L', careersUrl: 'https://www.ubs.com/global/en/careers.html', ats: 'custom', enabled: true },
  { name: 'Macquarie', tier: 'banking', location: 'Hyderabad, Gurgaon', salary: '₹20–32L', careersUrl: 'https://www.macquarie.com/au/en/careers.html', ats: 'custom', enabled: true },
  { name: 'GIC Singapore', tier: 'banking', location: 'Singapore', salary: 'S$100–200K', careersUrl: 'https://www.gic.com.sg/careers/', ats: 'custom', enabled: true },

  // ══════════ SEMICONDUCTOR / HARDWARE ══════════
  { name: 'NVIDIA', tier: 'semi', location: 'Bangalore, Hyderabad, Pune', salary: '₹30–55L', careersUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', ats: 'workday', atsSlug: 'nvidia/wd5/NVIDIAExternalCareerSite', enabled: true, verified: '2026-08-20' }, // 260
  { name: 'Micron', tier: 'semi', location: 'Hyderabad, Singapore', salary: '₹22–35L', careersUrl: 'https://careers.micron.com/', ats: 'workday', atsSlug: 'micron/wd1/External', enabled: true, verified: '2026-08-20' }, // 295
  { name: 'Intel', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹22–38L', careersUrl: 'https://jobs.intel.com/', ats: 'workday', atsSlug: 'intel/wd1/External', enabled: true, verified: '2026-08-20' }, // 62
  { name: 'NXP Semiconductors', tier: 'semi', location: 'Noida, Bangalore, Pune', salary: '₹20–35L', careersUrl: 'https://www.nxp.com/careers', ats: 'workday', atsSlug: 'nxp/wd3/careers', enabled: true, verified: '2026-08-20' }, // 203
  { name: 'Analog Devices', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹22–38L', careersUrl: 'https://www.analog.com/en/about-adi/careers.html', ats: 'workday', atsSlug: 'analogdevices/wd1/External', enabled: true, verified: '2026-08-20' }, // 109
  { name: 'Samsung', tier: 'semi', location: 'Bangalore (SRI-B), Noida', salary: '₹25–45L', careersUrl: 'https://sec.wd3.myworkdayjobs.com/Samsung_Careers', ats: 'workday', atsSlug: 'sec/wd3/Samsung_Careers', enabled: true, verified: '2026-08-20' }, // 50
  { name: 'Qualcomm', tier: 'semi', location: 'Hyderabad, Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.qualcomm.com/careers', ats: 'custom', enabled: true },
  { name: 'AMD', tier: 'semi', location: 'Hyderabad, Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.amd.com/careers-home', ats: 'custom', enabled: true },
  { name: 'ARM', tier: 'semi', location: 'Bangalore, Noida', salary: '₹25–40L', careersUrl: 'https://careers.arm.com/', ats: 'custom', enabled: true },
  { name: 'Broadcom', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹25–40L', careersUrl: 'https://www.broadcom.com/company/careers', ats: 'custom', enabled: true },
  { name: 'Texas Instruments', tier: 'semi', location: 'Bangalore', salary: '₹25–40L', careersUrl: 'https://careers.ti.com/', ats: 'custom', enabled: true },
  { name: 'Synopsys', tier: 'semi', location: 'Bangalore, Hyderabad', salary: '₹22–35L', careersUrl: 'https://careers.synopsys.com/', ats: 'custom', enabled: true },
  { name: 'Cadence', tier: 'semi', location: 'Noida, Bangalore', salary: '₹22–35L', careersUrl: 'https://www.cadence.com/en_US/home/company/careers.html', ats: 'custom', enabled: true },
  { name: 'Marvell', tier: 'semi', location: 'Hyderabad, Pune, Singapore', salary: '₹22–35L', careersUrl: 'https://www.marvell.com/company/careers.html', ats: 'custom', enabled: true },
  { name: 'MediaTek', tier: 'semi', location: 'Bangalore, Noida, Singapore', salary: '₹20–35L', careersUrl: 'https://careers.mediatek.com/', ats: 'custom', enabled: true },
];

/** Companies with a live, scannable API */
export function scannableCompanies(): Company[] {
  return COMPANIES.filter(c => c.enabled && c.ats !== 'custom');
}

/** Link-only companies (no public API) — still shown in coverage + calendar */
export function customCompanies(): Company[] {
  return COMPANIES.filter(c => c.enabled && c.ats === 'custom');
}
