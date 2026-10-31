'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Icon, parseTs, timeAgo, type Job } from './components';
import { EMPTY_PROFILE, KIND_LABEL, alumniQuery, claudePrompt, googleUrl, guessEmails, linkedinPeople, linkedinSearch, makeDraft, makeFollowUp, parseClaudeReply, xrayQuery, type Draft, type Kind, type Profile } from '@/lib/draft';

interface Contact { id: number; name: string; kind: Kind; linkedin_url: string | null; email: string | null; headline: string; last_at: string | null }
interface Hist { id: number; contact_id: number; channel: string; status: string; error: string | null; due_at: string | null; sent_at: string | null; created_at: string; parent_id: number | null }
interface Data { config: { send: boolean; search: boolean; cli: boolean; cap: number }; profile: Profile; contacts: Contact[]; history: Hist[]; domain: string; jd: string }
interface Found { name: string; headline: string; url: string }

const KINDS: Kind[] = ['sde', 'em', 'recruiter'];
const KEY = 'jr-okey';
export const store = { get: () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } }, set: (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } } };

/** `job` may be a stand-in with `cold: true` when there's no posting yet (a startup that just raised). */
export default function Outreach({ job, onClose }: { job: Job & { cold?: boolean }; onClose: () => void }) {
  const [key, setKey] = useState(store.get);
  const [locked, setLocked] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [showProfile, setShowProfile] = useState(false);
  const [found, setFound] = useState<Partial<Record<Kind, Found[]>>>({});
  const [searching, setSearching] = useState<Kind | null>(null);
  const [activeRaw, setActive] = useState<number | null>(null);
  const [pickedRaw, setPicked] = useState<Set<number> | null>(null);
  const [edits, setEdits] = useState<Record<number, Draft>>({});
  const [tab, setTab] = useState<'email' | 'dm'>('email');
  const [now] = useState(Date.now);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [manual, setManual] = useState(false);
  const [followUp, setFollowUp] = useState<Record<number, string>>({});
  const [reply, setReply] = useState('');
  const [pasted, setPasted] = useState('');
  const editor = useRef<HTMLDivElement>(null);

  const call = useCallback(async (body?: object) => {
    const qs = `?company=${encodeURIComponent(job.company)}&job=${encodeURIComponent(job.id)}`;
    const r = await fetch('/api/outreach' + (body ? '' : qs), {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-outreach-key': key },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) throw Object.assign(new Error(d.error || 'Locked'), { locked: true });
    if (!r.ok) throw new Error(d.error || 'Failed');
    return d;
  }, [job.company, job.id, key]);

  const say = (text: string, bad = false) => setMsg({ text, bad });
  const fail = (e: unknown) => { if ((e as { locked?: boolean }).locked) setLocked(true); else say((e as Error).message, true); };
  const [tick, setTick] = useState(0);
  const load = () => setTick(t => t + 1);
  useEffect(() => {
    let off = false;
    call().then((d: Data) => {
      if (off) return;
      setLocked(false); setData(d); setProfile(p => p.name ? p : d.profile);
      if (!d.profile.name) setShowProfile(true);
    }).catch(e => { if (off) return; if (e.locked) setLocked(true); else setMsg({ text: e.message, bad: true }); });
    return () => { off = true; };
  }, [call, tick]);

  // While anything is queued and the panel is open, nudge the server each minute so sends land on time.
  const queued = data?.history.filter(h => h.status === 'queued').length || 0;
  useEffect(() => {
    if (!queued) return;
    const t = setInterval(() => call({ action: 'drain' }).then(() => setTick(x => x + 1)).catch(() => {}), 60_000);
    return () => clearInterval(t);
  }, [queued, call]);

  const act = async (body: object, ok?: string) => {
    try { const d = await call(body); if (ok) say(ok); load(); return d; }
    catch (e) { fail(e); }
  };

  const contacts = data?.contacts || [];
  const hist = useMemo(() => {
    const m: Record<number, Hist[]> = {};
    for (const h of data?.history || []) (m[h.contact_id] ||= []).push(h);
    return m;
  }, [data]);
  const draftFor = (c: Contact): Draft => edits[c.id] || makeDraft(profile, job, c);
  const active = activeRaw ?? contacts[0]?.id ?? null;
  const cur = contacts.find(c => c.id === active) || null;
  const region = job.region;
  const firstMail = (id: number) => (hist[id] || []).find(h => h.channel === 'email' && h.status !== 'failed' && !h.parent_id);
  const emailed = (id: number) => !!firstMail(id);

  // Default first wave: up to 4 people who have an email and haven't been emailed for this role.
  const picked = pickedRaw ?? new Set(contacts.filter(c => c.email && !emailed(c.id)).slice(0, 4).map(c => c.id));

  const search = async (kind: Kind) => {
    setSearching(kind);
    try { setFound(f => ({ ...f, [kind]: [] })); const d = await call({ action: 'search', company: job.company, kind, region, title: job.cold ? '' : job.title }); setFound(f => ({ ...f, [kind]: d.found })); if (!d.found.length) say('No clean profiles found — try the Google link'); }
    catch (e) { fail(e); }
    setSearching(null);
  };
  const add = async (kind: Kind, f: Found) => {
    await act({ action: 'add', contact: { company: job.company, name: f.name, kind, linkedin_url: f.url, headline: f.headline } });
    setFound(s => ({ ...s, [kind]: s[kind]?.filter(x => x.url !== f.url) }));
  };

  const addPasted = async () => {
    try { for (const p of linkedinPeople(pasted)) await call({ action: 'add', contact: { ...p, company: job.company, kind: 'sde' } }); setPasted(''); load(); }
    catch (e) { fail(e); }
  };

  // Claude runs on your subscription: the prompt goes to claude.ai and its reply is pasted back,
  // or the local CLI answers directly when CLAUDE_CLI is set.
  const writers = contacts.filter(c => !emailed(c.id));
  const prompt = () => claudePrompt(profile, job, writers, data?.jd);
  const takeReply = (text: string) => {
    try {
      const d = parseClaudeReply(text, writers.map(c => c.id));
      setEdits(e => ({ ...e, ...d })); setReply('');
      say(`Claude wrote ${Object.keys(d).length} message${Object.keys(d).length === 1 ? '' : 's'}. Read each one before queueing.`);
      return true;
    } catch { return false; }
  };
  const openClaude = () => {
    navigator.clipboard?.writeText(prompt());
    window.open('https://claude.ai/new', '_blank', 'noopener');
    say('Prompt copied. Paste it into Claude, then paste the reply back here.');
  };
  const runCli = async () => {
    setBusy('claude');
    try { if (!takeReply((await call({ action: 'claude', prompt: prompt() })).reply)) say('Claude’s reply wasn’t usable. Try again.', true); }
    catch (e) { fail(e); }
    setBusy('');
  };

  const queue = async () => {
    const items = contacts.filter(c => picked.has(c.id)).map(c => ({ contact_id: c.id, subject: draftFor(c).subject, body: draftFor(c).email }));
    setBusy('queue');
    await act({ action: 'queue', job_id: job.id, items }, `Queued ${items.length} — they go out 6–12 min apart, 9am–6pm IST`);
    setPicked(new Set()); setBusy('');
  };

  const guesses = cur && !cur.email ? guessEmails(cur.name, contacts.filter(c => c.email), data?.domain || '') : [];
  const mail = cur ? firstMail(cur.id) : undefined;
  const followable = mail?.status === 'sent' && now - parseTs(mail.sent_at || mail.created_at) > 36 * 3_600_000
    && !hist[mail.contact_id].some(h => h.parent_id === mail.id) ? mail : null;

  const copy = (t: string, what: string) => { navigator.clipboard?.writeText(t); say(`${what} copied`); };
  const pickable = contacts.filter(c => picked.has(c.id));
  const resumeOk = /^https?:\/\//.test(profile.resumeUrl);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setProfile(p => ({ ...p, [k]: e.target.value }));
  const newPeople = linkedinPeople(pasted);
  const details = (
    <section className="ox-card">
      <button className="ox-toggle" onClick={() => setShowProfile(v => !v)}>
        <b>Your details</b><span className="muted">{profile.name ? `${profile.name}${resumeOk ? ' · resume linked' : ' · add resume link'}` : 'Fill once, used in every message'}</span>
        <Icon name="chevron" size={16} />
      </button>
      {showProfile && (
        <div className="ox-form">
          <div className="ox-row"><input placeholder="Full name" value={profile.name} onChange={set('name')} /><input placeholder="Grad year" inputMode="numeric" value={profile.gradYear} onChange={set('gradYear')} style={{ maxWidth: 90 }} /></div>
          <input placeholder="College" value={profile.college} onChange={set('college')} />
          <input placeholder="Resume link (public PDF — Drive share link works)" value={profile.resumeUrl} onChange={set('resumeUrl')} />
          <textarea rows={3} placeholder="Your pitch in 2 lines: best project, CP/LeetCode, stack" value={profile.pitch} onChange={set('pitch')} />
          <textarea rows={2} placeholder="Links (GitHub, LinkedIn, portfolio), one per line" value={profile.links} onChange={set('links')} />
          <button className="btn primary sm" onClick={async () => { await act({ action: 'profile', profile }, 'Saved'); setShowProfile(false); }}>Save</button>
        </div>
      )}
    </section>
  );

  return (
    <>
      <div className="ox-scrim" onClick={onClose} />
      <aside className="ox" role="dialog" aria-label="Reach out">
        <header className="ox-head">
          <div className="grabber" />
          <div className="ox-title">
            <Avatar company={job.company} tier={job.tier} size={36} />
            <div><b>Reach out · {job.company}</b><span>{job.title}</span></div>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        </header>

        {locked ? (
          <div className="ox-body one">
            <section className="ox-card">
              <h4>Unlock</h4>
              <p className="muted">Outreach sends mail from your mailbox, so it needs the <code>OUTREACH_KEY</code> you set on the server.</p>
              <form className="ox-row" onSubmit={e => { e.preventDefault(); const v = new FormData(e.currentTarget).get('k') as string; store.set(v); setKey(v); }}>
                <input name="k" type="password" placeholder="Outreach key" autoComplete="off" />
                <button className="btn primary">Unlock</button>
              </form>
              {msg && <p className="ox-msg bad">{msg.text}</p>}
            </section>
          </div>
        ) : !data ? <div className="ox-body one"><div className="card skeleton"><i /><i /><i /></div></div> : (
          <div className="ox-body">
            {/* ── Left: profile + find + people ── */}
            <div className="ox-col">
              {!data.profile.name && details}

              <section className="ox-card">
                <h4><i className="ox-n">1</i> Find people</h4>
                <div className="ox-find">
                  {KINDS.map(k => (
                    <div key={k} className="ox-find-row">
                      {data.config.search
                        ? <button className="btn sm" onClick={() => search(k)} disabled={searching !== null}>{searching === k ? <span className="spin"><Icon name="refresh" size={14} /></span> : <Icon name="search" size={14} />} {KIND_LABEL[k]}s</button>
                        : <span className="ox-kind">{KIND_LABEL[k]}s</span>}
                      <a className="ox-g" href={googleUrl(xrayQuery(job.company, k, region, job.cold ? '' : job.title))} target="_blank" rel="noopener noreferrer">Open in Google <Icon name="external" size={13} /></a>
                    </div>
                  ))}
                  {profile.college && (
                    <div className="ox-find-row">
                      <span className="ox-kind">Your alumni</span>
                      <span className="ox-g-two">
                        <a className="ox-g" href={googleUrl(alumniQuery(job.company, profile.college))} target="_blank" rel="noopener noreferrer">Google <Icon name="external" size={13} /></a>
                        <a className="ox-g" href={linkedinSearch(`${job.company} ${profile.college}`)} target="_blank" rel="noopener noreferrer">LinkedIn <Icon name="external" size={13} /></a>
                      </span>
                    </div>
                  )}
                </div>
                <textarea rows={2} value={pasted} onChange={e => setPasted(e.target.value)} placeholder="Paste LinkedIn links here, as many as you like" aria-label="LinkedIn links" />
                {newPeople.length > 0 && <button className="btn sm" onClick={addPasted}>Add {newPeople.length} {newPeople.length === 1 ? 'person' : 'people'}</button>}
                {KINDS.map(k => found[k]?.length ? (
                  <div key={k} className="ox-found">
                    {found[k]!.map(f => (
                      <div key={f.url} className="ox-person">
                        <div className="ox-ptext"><a href={f.url} target="_blank" rel="noopener noreferrer"><b>{f.name}</b></a><span>{f.headline}</span></div>
                        <button className="btn sm" onClick={() => add(k, f)}>Add</button>
                      </div>
                    ))}
                  </div>
                ) : null)}
                <button className="ox-link" onClick={() => setManual(v => !v)}>{manual ? 'Cancel' : '+ Add someone manually'}</button>
                {manual && <ManualAdd company={job.company} onAdd={async c => { await act({ action: 'add', contact: c }); setManual(false); }} />}
              </section>

              <section className="ox-card">
                <h4>People at {job.company} <span className="cnt">{contacts.length}</span></h4>
                {contacts.length === 0 && <p className="muted">Nobody yet — find people above, or add one you know.</p>}
                {contacts.map(c => {
                  const hs = hist[c.id] || [];
                  const em = firstMail(c.id);
                  const dm = hs.find(h => h.channel === 'linkedin');
                  const sentAt = em?.sent_at || dm?.sent_at;
                  const stale = sentAt && em?.status !== 'replied' && now - parseTs(sentAt) > 36 * 3_600_000;
                  return (
                    <div key={c.id} className={`ox-person sel ${active === c.id ? 'on' : ''}`} onClick={() => { setActive(c.id); editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                      <input type="checkbox" aria-label={`Email ${c.name}`} checked={picked.has(c.id)} disabled={!c.email || emailed(c.id)}
                        onClick={e => e.stopPropagation()} onChange={() => setPicked(() => { const n = new Set(picked); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
                      <div className="ox-ptext">
                        <b>{c.name} <i className={`ox-badge k-${c.kind}`}>{KIND_LABEL[c.kind]}</i></b>
                        <span>{c.headline || c.email || 'No email yet'}</span>
                        <span className="ox-tags">
                          {em?.status === 'queued' && <em>queued · {timeAgo(em.created_at)}</em>}
                          {em && em.status !== 'queued' && <em className={em.status === 'replied' ? 'ok' : ''}>{em.status === 'replied' ? 'replied' : `emailed ${timeAgo(em.sent_at || em.created_at)} ago`}</em>}
                          {dm && <em>DM sent</em>}
                          {stale && <em className="warn">no reply · follow up</em>}
                          {!sentAt && c.last_at && <em>contacted elsewhere</em>}
                          {!c.email && <em className="warn">needs email</em>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </section>

              {data.profile.name && details}
            </div>

            {/* ── Right: editor ── */}
            <div className="ox-col" ref={editor}>
              <section className="ox-card">
                <h4><i className="ox-n">2</i> Write with Claude</h4>
                {!writers.length ? <p className="muted">Add people first. Claude writes one message per person.</p> : (<>
                  <p className="muted">One personal message for each of {writers.length === 1 ? 'your 1 person' : `your ${writers.length} people`}, from {data.jd ? 'this job’s description' : 'this role'} and your details. Uses your Claude plan, no API key.</p>
                  <div className="ox-actions">
                    {data.config.cli && <button className="btn primary sm" onClick={runCli} disabled={busy === 'claude'}><Icon name="sparkle" size={14} /> {busy === 'claude' ? 'Writing, up to a minute…' : 'Write with Claude'}</button>}
                    <button className={`btn sm ${data.config.cli ? '' : 'primary'}`} onClick={openClaude}><Icon name="copy" size={14} /> Copy prompt, open Claude</button>
                  </div>
                  <textarea rows={2} value={reply} placeholder="Paste Claude’s reply here" aria-label="Claude’s reply"
                    onChange={e => { setReply(e.target.value); if (e.target.value.includes('}') && !takeReply(e.target.value)) say('That doesn’t look like Claude’s full reply. Copy all of it.', true); }} />
                </>)}
              </section>

              {!cur ? <section className="ox-card"><p className="muted">Pick a person to see their message.</p></section> : (
                <section className="ox-card">
                  <h4><i className="ox-n">3</i> Review and send</h4>
                  <div className="ox-person flat">
                    <div className="ox-ptext"><b>{cur.name}</b><span>{cur.headline}</span></div>
                    {cur.linkedin_url && <a className="btn sm" href={cur.linkedin_url} target="_blank" rel="noopener noreferrer">Profile <Icon name="external" size={13} /></a>}
                    <button className="icon-btn sm" aria-label="Remove contact" onClick={() => { if (confirm(`Remove ${cur.name}?`)) { setActive(null); act({ action: 'delete', id: cur.id }); } }}><Icon name="x" size={15} /></button>
                  </div>
                  <div className="ox-row">
                    <input type="email" placeholder="their email" defaultValue={cur.email || ''} key={cur.id + (cur.email || '')}
                      onBlur={e => { if ((e.target.value || null) !== cur.email) act({ action: 'update', id: cur.id, email: e.target.value }); }} />
                    <select value={cur.kind} onChange={e => act({ action: 'update', id: cur.id, email: cur.email, kind: e.target.value })} aria-label="Role">
                      {KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                  </div>

                  {!cur.email && guesses.length > 0 && (
                    <div className="ox-guess">
                      <span className="muted">{guesses[0].learned ? 'Company format:' : 'Guess (unverified):'}</span>
                      {guesses.map(g => <button key={g.email} className={`chip-sm ${g.learned ? 'on' : ''}`} onClick={() => act({ action: 'update', id: cur.id, email: g.email })}>{g.email}</button>)}
                    </div>
                  )}

                  <div className="seg ox-seg" role="tablist">
                    <button role="tab" aria-selected={tab === 'email'} className={tab === 'email' ? 'on' : ''} onClick={() => setTab('email')}>Email + resume</button>
                    <button role="tab" aria-selected={tab === 'dm'} className={tab === 'dm' ? 'on' : ''} onClick={() => setTab('dm')}>LinkedIn note</button>
                  </div>

                  {tab === 'email' ? (<>
                    <input value={draftFor(cur).subject} onChange={e => setEdits(x => ({ ...x, [cur.id]: { ...draftFor(cur), subject: e.target.value } }))} aria-label="Subject" />
                    <textarea rows={12} value={draftFor(cur).email} onChange={e => setEdits(x => ({ ...x, [cur.id]: { ...draftFor(cur), email: e.target.value } }))} aria-label="Email body" />
                  </>) : (<>
                    <textarea rows={6} value={draftFor(cur).dm} onChange={e => setEdits(x => ({ ...x, [cur.id]: { ...draftFor(cur), dm: e.target.value } }))} aria-label="LinkedIn note" />
                    <p className={`muted ${draftFor(cur).dm.length > 300 ? 'over' : ''}`}>{draftFor(cur).dm.length}/300 (connection-note limit)</p>
                  </>)}

                  <div className="ox-actions">
                    {edits[cur.id] && <button className="btn ghost sm" onClick={() => setEdits(x => { const n = { ...x }; delete n[cur.id]; return n; })}>Reset</button>}
                    <button className="btn sm" onClick={() => copy(tab === 'email' ? draftFor(cur).email : draftFor(cur).dm, tab === 'email' ? 'Email' : 'Note')}><Icon name="copy" size={14} /> Copy</button>
                    {cur.kind === 'sde' && <button className="btn sm" onClick={() => copy(draftFor(cur).blurb, 'Referral blurb')}><Icon name="copy" size={14} /> Referral blurb</button>}
                    {tab === 'dm' && <button className="btn sm" onClick={() => act({ action: 'log', job_id: job.id, contact_id: cur.id, body: draftFor(cur).dm }, 'Logged as sent')}><Icon name="check" size={14} /> Mark DM sent</button>}
                  </div>

                  {(hist[cur.id] || []).filter(h => h.status === 'sent' || h.status === 'replied').some(h => h.channel === 'email') && (() => {
                    const h = hist[cur.id].find(x => x.channel === 'email' && (x.status === 'sent' || x.status === 'replied'))!;
                    return <label className="ox-check"><input type="checkbox" checked={h.status === 'replied'} onChange={e => act({ action: 'reply', id: h.id, replied: e.target.checked })} /> They replied{h.error ? <span className="warn"> · {h.error}</span> : null}</label>;
                  })()}
                  {followable && (
                    <div className="ox-followup">
                      <h4>No reply in 36h: follow up once</h4>
                      <textarea rows={5} value={followUp[cur.id] ?? makeFollowUp(profile, cur)} onChange={e => setFollowUp(f => ({ ...f, [cur.id]: e.target.value }))} aria-label="Follow-up" />
                      <button className="btn sm" disabled={!data.config.send} onClick={() => act({ action: 'followup', parent_id: followable.id, body: followUp[cur.id] ?? makeFollowUp(profile, cur) }, 'Follow-up queued in the same thread')}>Queue follow-up</button>
                    </div>
                  )}
                  {(hist[cur.id] || []).filter(h => h.status === 'queued' || h.status === 'failed').map(h => (
                    <p key={h.id} className="ox-queued">{h.status === 'queued' ? `Queued for ${new Date(parseTs(h.due_at || h.created_at)).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : <span className="warn">Failed: {h.error}</span>}
                      <button className="ox-link" onClick={() => act({ action: 'cancel', id: h.id })}>{h.status === 'queued' ? 'Cancel' : 'Dismiss'}</button></p>
                  ))}
                </section>
              )}
            </div>
          </div>
        )}

        {data && !locked && (
          <footer className="ox-foot">
            {msg && <p className={`ox-msg ${msg.bad ? 'bad' : ''}`} role="status">{msg.text}</p>}
            <div className="ox-foot-row">
              <span className="muted">{!data.config.send ? <>Set <code>SMTP_USER</code> + <code>SMTP_PASS</code> to send from here — copy buttons work meanwhile.</>
                : !resumeOk ? 'Add a resume link in “Your details” so it can be attached.' : `Plain text, resume attached · max ${data.config.cap}/day`}</span>
              <button className="btn primary" onClick={queue} disabled={!pickable.length || !data.config.send || busy === 'queue'}>
                Queue {pickable.length || ''} email{pickable.length === 1 ? '' : 's'}
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}

function ManualAdd({ company, onAdd }: { company: string; onAdd: (c: object) => void }) {
  const [f, setF] = useState({ name: '', linkedin_url: '', email: '', kind: 'sde' as Kind });
  return (
    <form className="ox-form" onSubmit={e => { e.preventDefault(); onAdd({ ...f, company }); }}>
      <input required placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input placeholder="linkedin.com/in/…" value={f.linkedin_url} onChange={e => setF({ ...f, linkedin_url: e.target.value })} />
      <div className="ox-row">
        <input type="email" placeholder="Email (optional)" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as Kind })} aria-label="Role">{KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
      </div>
      <button className="btn sm">Add</button>
    </form>
  );
}
