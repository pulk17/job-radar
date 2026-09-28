// Notification channels, all free:
//   Web Push (primary)  → tap "Enable alerts" in the app on each device; zero config
//   Telegram (optional) → TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//   ntfy.sh  (optional) → NTFY_TOPIC
import { NewJobInfo } from './adapters/fetcher';
import { getPushSubscriptions } from './db';
import { sendPush } from './push';

export interface Channels { push: number; telegram: boolean; ntfy: boolean; }

export async function notificationChannels(): Promise<Channels> {
  return {
    push: (await getPushSubscriptions()).length,
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    ntfy: Boolean(process.env.NTFY_TOPIC),
  };
}

export const anyChannel = (c: Channels) => c.push > 0 || c.telegram || c.ntfy;

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch (err) {
    console.error('[notify] telegram failed:', err);
    return false;
  }
}

async function sendNtfy(title: string, body: string, clickUrl?: string): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': title, 'Priority': 'high', 'Tags': 'briefcase', ...(clickUrl ? { 'Click': clickUrl } : {}) },
      body,
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch (err) {
    console.error('[notify] ntfy failed:', err);
    return false;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const flag = (r: string) => r === 'singapore' ? '🇸🇬' : r === 'remote' ? '🌐' : '🇮🇳';
const badge = (t: string) => t === 'intern' ? 'Intern' : t === 'newgrad' ? 'New grad' : '';

/** Send a digest of new jobs. Returns true if at least one channel accepted it. */
export async function notifyNewJobs(jobs: NewJobInfo[], appUrl?: string): Promise<boolean> {
  if (jobs.length === 0) return false;
  const top = jobs.slice(0, 12);
  const title = jobs.length === 1
    ? `${top[0].company} · ${badge(top[0].roleType) || 'new role'}`
    : `${jobs.length} new early-career roles`;

  // A phone notification shows ~4 lines, so lead with the best matches.
  const pushBody = jobs.length === 1
    ? `${flag(top[0].region)} ${top[0].title}`
    : top.slice(0, 4).map(j => `${flag(j.region)} ${j.company} — ${j.title}`).join('\n')
      + (jobs.length > 4 ? `\n+${jobs.length - 4} more` : '');

  const tgText = `🎯 <b>${esc(title)}</b>\n\n` + top.map(j =>
    `${flag(j.region)} <b>${esc(j.company)}</b>${badge(j.roleType) ? ` [${badge(j.roleType)}]` : ''}\n<a href="${esc(j.applyUrl)}">${esc(j.title)}</a> · ${Math.round(j.score * 100)}%`
  ).join('\n\n') + (jobs.length > top.length ? `\n\n…and ${jobs.length - top.length} more` : '')
    + (appUrl ? `\n\n<a href="${appUrl}">Open Job Radar</a>` : '');

  const [push, tg, nt] = await Promise.all([
    // One job → straight to its posting; a batch → the app's inbox.
    sendPush({ title, body: pushBody, url: jobs.length === 1 ? top[0].applyUrl : '/', tag: 'new-jobs' }),
    sendTelegram(tgText),
    sendNtfy(title, pushBody, appUrl || top[0].applyUrl),
  ]);
  return push > 0 || tg || nt;
}

/** Test message to every configured channel. */
export async function sendTestNotification(): Promise<{ push: number; telegram: boolean; ntfy: boolean }> {
  const msg = 'Alerts are working. You\'ll get a ping when new internships and new-grad roles appear.';
  const [push, telegram, ntfy] = await Promise.all([
    sendPush({ title: 'Job Radar ✓', body: msg, url: '/', tag: 'test' }),
    sendTelegram(`✅ ${msg}`),
    sendNtfy('Job Radar test', msg),
  ]);
  return { push, telegram, ntfy };
}
