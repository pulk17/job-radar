import { getLinksToCheck, updateLinkStatus } from './db';

// Check if a URL is still live
async function checkUrl(url: string): Promise<number> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobRadar/2.0; link-checker)' },
      redirect: 'follow',
    });
    // 2xx/3xx = live, 404/410 = dead, others = uncertain (treat as live)
    if (res.status === 404 || res.status === 410) return 0;
    if (res.status >= 200 && res.status < 400) return 1;
    // Some sites block HEAD, try GET
    const getRes = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobRadar/2.0; link-checker)',
        'Range': 'bytes=0-0',
      },
      redirect: 'follow',
    });
    if (getRes.status === 404 || getRes.status === 410) return 0;
    return 1;
  } catch {
    // Network error / timeout — don't mark as dead, could be temporary
    return 1;
  }
}

export async function checkLinks(batchSize = 30): Promise<{ checked: number; dead: number }> {
  const links = await getLinksToCheck(batchSize);
  let dead = 0;

  const concurrency = 5;
  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency);
    await Promise.allSettled(
      batch.map(async (link) => {
        const status = await checkUrl(link.apply_url);
        await updateLinkStatus(link.id, status);
        if (status === 0) dead++;
      })
    );
    if (i + concurrency < links.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return { checked: links.length, dead };
}
