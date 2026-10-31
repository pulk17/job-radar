import { NextRequest, NextResponse } from 'next/server';
import * as o from '@/lib/outreach';
import { getJd } from '@/lib/db';

export const maxDuration = 60;

// Sends mail from your mailbox, so unlike the rest of the app it is locked: set OUTREACH_KEY
// (required in production) and enter it once in the Reach out panel.
function locked(req: NextRequest) {
  const key = process.env.OUTREACH_KEY;
  if (key ? req.headers.get('x-outreach-key') === key : process.env.NODE_ENV !== 'production') return null;
  return NextResponse.json({ error: key ? 'Wrong key' : 'Set OUTREACH_KEY on the server first', locked: true }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const denied = locked(req);
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  if (sp.has('outbox')) return NextResponse.json({ followUps: await o.followUpsDue() });
  const company = sp.get('company') || '', job = sp.get('job') || '';
  const [profile, contacts, history, jd] = await Promise.all([o.getProfile(), o.listContacts(company), o.jobHistory(job), getJd(job)]);
  return NextResponse.json({ config: o.config(), profile, contacts, history, jd, domain: o.companyDomain(company) });
}

export async function POST(req: NextRequest) {
  const denied = locked(req);
  if (denied) return denied;
  const b = await req.json();
  try {
    switch (b.action) {
      case 'profile': await o.saveProfile(b.profile); break;
      case 'add': await o.addContact(b.contact); break;
      case 'update': await o.updateContact(b.id, b.email, b.kind); break;
      case 'delete': await o.deleteContact(b.id); break;
      case 'queue': await o.queueEmails(b.job_id, b.items); break;
      case 'followup': await o.queueFollowUp(b.parent_id, b.body); break;
      case 'log': await o.logLinkedin(b.job_id, b.contact_id, b.body); break;
      case 'reply': await o.setReplied(b.id, !!b.replied); break;
      case 'cancel': await o.cancelQueued(b.id); break;
      case 'drain': return NextResponse.json(await o.sendDue());
      case 'search': return NextResponse.json({ found: await o.xraySearch(b.company, b.kind, b.region, b.title) });
      case 'claude': return NextResponse.json({ reply: await o.claudeCli(b.prompt) });
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof o.OutreachError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[outreach]', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
