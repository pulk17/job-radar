// Pure parsing for the Signals feeds, kept apart so `npm run check` can run it without a DB.

const decode = (s: string) => s
  .replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  .trim();

/** Just enough RSS: these feeds are machine-generated and only need title, link, date. */
export function parseRss(xml: string): Array<{ title: string; link: string; date: number }> {
  const tag = (block: string, t: string) => decode(block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] || '');
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].map(([b]) => ({
    title: tag(b, 'title'), link: tag(b, 'link'), date: Date.parse(tag(b, 'pubDate')) || 0,
  })).filter(i => i.title && i.link);
}

const NOT_A_ROUND = /\bfund\b|\bvc\b|galore|this week|weekly|roundup|in talks|\bipo\b|\bq[1-4]\b|\bdebt\b|\bsells?\b/i;

/** "Acme Raises $20 Mn Series B" → who raised and how much; null for anything else. */
export function parseFunding(title: string): { org: string; detail: string } | null {
  if (NOT_A_ROUND.test(title)) return null;
  const who = title.match(/^(?:\[[^\]]+\]\s*)?(?:[\w-]+-backed\s+)?(.+?)\s+(?:raises?|raised|secures?|bags?|lands?|nets?|closes?|picks up|scores?)\b/i);
  const amount = title.match(/[$₹]\s?[\d.,]+\s?(?:mn|million|bn|billion|cr|crore|k)?\b|\b[\d.,]+\s?(?:mn|million|cr|crore)\b/i)?.[0];
  if (!who || !amount) return null;
  const round = title.match(/\b(?:pre-)?(?:seed|series [a-f])\b/i)?.[0];
  return { org: who[1].replace(/^.*:\s*/, '').trim(), detail: [amount, round && round.replace(/^s/, 'S')].filter(Boolean).join(' · ') };
}

const HIRING = /\b(hiring|we'?re looking for|looking for|open roles?|join (?:my|our) team|dm me|apply here|google form)\b/i;
const NOT_HIRING = /\bi(?:'ve| have)? (?:got|joined|accepted|am open to)\b|happy to share|thrilled to|excited to announce|looking for (?:a job|opportunities|internship)/i;

/** A real "my team is hiring" post, not someone announcing they got a job. */
export const isHiringPost = (text: string) => HIRING.test(text) && !NOT_HIRING.test(text);
