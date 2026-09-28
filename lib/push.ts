// Web Push straight from the browser's own push service — no app to install, no
// account, no token. Implements VAPID (RFC 8292) and aes128gcm payload encryption
// (RFC 8291) with node:crypto, so there's no dependency to keep patched.
//
// The VAPID key pair is generated on first use and kept in the `meta` table, so
// deploying needs zero configuration.
import crypto from 'crypto';
import { getOrSetMeta, getPushSubscriptions, deletePushSubscription, type PushSubscriptionRow } from './db';

const b64u = (b: Buffer) => b.toString('base64url');

async function vapidKeys(): Promise<{ jwk: crypto.JsonWebKey; publicKey: string }> {
  const stored = await getOrSetMeta('vapid_keys', () =>
    JSON.stringify(crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' })));
  const jwk = JSON.parse(stored) as crypto.JsonWebKey;
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, 'base64url'), Buffer.from(jwk.y!, 'base64url')]);
  return { jwk, publicKey: b64u(raw) };
}

export async function getPublicKey(): Promise<string> {
  return (await vapidKeys()).publicKey;
}

function vapidHeader(endpoint: string, jwk: crypto.JsonWebKey, publicKey: string): string {
  const enc = (o: object) => b64u(Buffer.from(JSON.stringify(o)));
  // Apple rejects a subject it can't parse as mailto:/https:, so use the app's URL when we have one.
  const sub = process.env.APP_URL?.startsWith('https://') ? process.env.APP_URL : 'mailto:job-radar@users.noreply.github.com';
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })}`;
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key: crypto.createPrivateKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${unsigned}.${b64u(sig)}, k=${publicKey}`;
}

/** RFC 8291 message encryption, single aes128gcm record. */
export function encryptPayload(payload: string, p256dh: string, auth: string): Buffer {
  const uaPublic = Buffer.from(p256dh, 'base64url');
  const ecdh = crypto.createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();
  const hkdf = (ikm: Buffer, salt: Buffer, info: Buffer, len: number) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));

  const ikm = hkdf(ecdh.computeSecret(uaPublic), Buffer.from(auth, 'base64url'),
    Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32);
  const salt = crypto.randomBytes(16);
  const cek = hkdf(ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

export interface PushMessage { title: string; body: string; url?: string; tag?: string; }

async function sendOne(sub: PushSubscriptionRow, msg: PushMessage, keys: { jwk: crypto.JsonWebKey; publicKey: string }): Promise<boolean> {
  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidHeader(sub.endpoint, keys.jwk, keys.publicKey),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      body: new Uint8Array(encryptPayload(JSON.stringify(msg), sub.p256dh, sub.auth)),
      signal: AbortSignal.timeout(10000),
    });
    // 404/410 = the browser dropped this subscription (reinstall, cleared data): forget it.
    if (res.status === 404 || res.status === 410) await deletePushSubscription(sub.endpoint);
    else if (!res.ok) console.error('[push] rejected', res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error('[push] failed:', err);
    return false;
  }
}

/** Push to every subscribed device (or just `only`). Returns how many accepted it. */
export async function sendPush(msg: PushMessage, only?: PushSubscriptionRow): Promise<number> {
  const subs = only ? [only] : await getPushSubscriptions();
  if (subs.length === 0) return 0;
  const keys = await vapidKeys();
  const ok = await Promise.all(subs.map(s => sendOne(s, msg, keys)));
  return ok.filter(Boolean).length;
}

// Only real browser push services — the endpoint is a URL a stranger could
// otherwise point this server at.
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
export function isValidSubscription(s: unknown): s is { endpoint: string; keys: { p256dh: string; auth: string } } {
  const x = s as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof x?.endpoint !== 'string' || typeof x.keys?.p256dh !== 'string' || typeof x.keys?.auth !== 'string') return false;
  try {
    const u = new URL(x.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}
