// Free notification channels: Telegram bot + ntfy.sh.
// Configure via env:
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  → Telegram push
//   NTFY_TOPIC                             → ntfy.sh push (subscribe in the ntfy app)
import { NewJobInfo } from './adapters/fetcher';

export function notificationChannels(): { telegram: boolean; ntfy: boolean } {
  return {
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    ntfy: Boolean(process.env.NTFY_TOPIC),
  };
}

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
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'briefcase',
        ...(clickUrl ? { 'Click': clickUrl } : {}),
      },
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

/** Send a digest of new jobs. Returns true if at least one channel accepted it. */
export async function notifyNewJobs(jobs: NewJobInfo[], appUrl?: string): Promise<boolean> {
  if (jobs.length === 0) return false;
  const top = jobs.slice(0, 12);
  const flag = (r: string) => r === 'singapore' ? '🇸🇬' : r === 'remote' ? '🌐' : '🇮🇳';
  const badge = (t: string) => t === 'intern' ? ' [INTERN]' : t === 'newgrad' ? ' [NEW GRAD]' : '';

  const tgLines = top.map(j =>
    `${flag(j.region)} <b>${esc(j.company)}</b>${badge(j.roleType)}\n<a href="${esc(j.applyUrl)}">${esc(j.title)}</a> · ${Math.round(j.score * 100)}%`
  );
  const more = jobs.length > top.length ? `\n\n…and ${jobs.length - top.length} more` : '';
  const tgText = `🎯 <b>${jobs.length} new matched job${jobs.length > 1 ? 's' : ''}</b>\n\n${tgLines.join('\n\n')}${more}${appUrl ? `\n\n<a href="${appUrl}">Open Job Radar</a>` : ''}`;

  const ntfyBody = top.map(j =>
    `${flag(j.region)} ${j.company}${badge(j.roleType)}: ${j.title} (${Math.round(j.score * 100)}%)`
  ).join('\n') + (jobs.length > top.length ? `\n…and ${jobs.length - top.length} more` : '');

  const [tg, nt] = await Promise.all([
    sendTelegram(tgText),
    sendNtfy(`${jobs.length} new matched job${jobs.length > 1 ? 's' : ''}`, ntfyBody, appUrl || top[0].applyUrl),
  ]);
  return tg || nt;
}

/** Simple test message to verify channel configuration. */
export async function sendTestNotification(): Promise<{ telegram: boolean; ntfy: boolean }> {
  const [telegram, ntfy] = await Promise.all([
    sendTelegram('✅ Job Radar notifications are working. You will get a digest whenever new matched jobs appear.'),
    sendNtfy('Job Radar test', 'Notifications are working. You will get a digest whenever new matched jobs appear.'),
  ]);
  return { telegram, ntfy };
}
