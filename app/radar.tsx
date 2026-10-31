'use client';
/* eslint-disable @next/next/no-img-element -- tiny static logo, next/image adds nothing here */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Outreach, { store as outreachKey } from './outreach';
import Signals from './signals';
import { Avatar, Icon, JobCard, JobDetail, Sheet, TIER_LABEL, STATUSES, statusLabel, parseTs, timeAgo, isNew, isRecent, type Job, type HiringWindow } from './components';

interface CompanyInfo {
  name: string; tier: string; location: string; salary: string;
  careersUrl: string; scannable: boolean;
  lastScanAt: string | null; lastError: string | null; totalJobs: number | null;
}
// The whole job: what needs you today → pick roles → work them through the pipeline. Radar is for looking ahead.
type Tab = 'today' | 'roles' | 'pipeline' | 'radar';
type RadarView = 'signals' | 'calendar' | 'companies';
interface FollowUp { id: number; job_id: string; name: string; company: string; title: string | null }
type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'today', label: 'Today', icon: 'zap' },
  { key: 'roles', label: 'Roles', icon: 'search' },
  { key: 'pipeline', label: 'Pipeline', icon: 'tracker' },
  { key: 'radar', label: 'Radar', icon: 'radar' },
];
const VIEWS: Array<{ key: RadarView; label: string }> = [{ key: 'signals', label: 'Signals' }, { key: 'calendar', label: 'Hiring calendar' }, { key: 'companies', label: 'Companies' }];
const LEVELS = [
  { key: 'eligible', label: 'Eligible' }, { key: 'batch', label: 'Your batch' }, { key: 'intern', label: 'Intern' },
  { key: 'newgrad', label: 'New grad' }, { key: 'unclear', label: 'Unclear' },
];
// "Focus" = big tech + startups + product + AI; quant/finance/hardware are one tap away.
const FOCUS_TIERS = ['faang', 'startup', 'product', 'ai'];
const TIERS = [{ key: 'all', label: 'All companies' }, { key: 'focus', label: '⭐ Focus' },
  ...Object.entries(TIER_LABEL).map(([key, label]) => ({ key, label }))];
const REGIONS = [{ key: 'all', label: 'India + Singapore' }, { key: 'india', label: '🇮🇳 India' },
  { key: 'singapore', label: '🇸🇬 Singapore' }, { key: 'remote', label: '🌐 Remote' }];
const SORTS = [{ key: 'score', label: 'Best match' }, { key: 'date', label: 'Newest' }, { key: 'company', label: 'Company A–Z' }];
const DONE = ['applied', 'oa', 'interviewing', 'offered', 'rejected'];
const DEFAULTS: Record<string, string> = { tab: 'today', level: 'eligible', tier: 'all', region: 'all', sort: 'score', q: '', co: '', langs: '' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE = 40;

const matchesLevel = (j: Job, level: string) =>
  level === 'unclear' ? j.elig !== 'yes'
    : j.elig === 'yes' && (level === 'eligible' || (level === 'batch' ? j.batch_fit === 'fit' : level === 'intern' ? j.role_type === 'intern' : j.role_type !== 'intern'));

/** Best match, but a company's 2nd, 3rd… posting slides down so one big board can't flood the top. */
function rank(list: Job[], sort: string): Job[] {
  if (sort === 'date') return [...list].sort((a, b) => parseTs(b.first_seen) - parseTs(a.first_seen));
  if (sort === 'company') return [...list].sort((a, b) => a.company.localeCompare(b.company) || b.match_score - a.match_score);
  const seen: Record<string, number> = {};
  return [...list].sort((a, b) => b.match_score - a.match_score)
    .map(j => ({ j, k: j.match_score - 0.06 * (seen[j.company] = (seen[j.company] ?? -1) + 1) }))
    .sort((a, b) => b.k - a.k).map(x => x.j);
}

const desktopQuery = '(min-width: 1024px)';
const subscribeDesktop = (cb: () => void) => { const m = matchMedia(desktopQuery); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

export default function Radar() {
  const url = useMemo(() => new URLSearchParams(window.location.search), []);
  const init = (k: string) => url.get(k) || DEFAULTS[k];
  const [tab, setTab] = useState<Tab>(TABS.some(t => t.key === init('tab')) ? init('tab') as Tab : 'today');
  const [view, setView] = useState<RadarView>('signals');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [level, setLevel] = useState(init('level'));
  const [tier, setTier] = useState(init('tier'));
  const [region, setRegion] = useState(init('region'));
  const [sort, setSort] = useState(init('sort'));
  const [q, setQ] = useState(init('q'));
  const [co, setCo] = useState(init('co'));
  const [langs, setLangs] = useState<string[]>(init('langs') ? init('langs').split(',') : []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [langOpts, setLangOpts] = useState<Array<{ language: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [calendar, setCalendar] = useState<{ all: HiringWindow[]; activeNow: HiringWindow[]; upcoming: HiringWindow[] }>({ all: [], activeNow: [], upcoming: [] });
  const [companies, setCompanies] = useState<CompanyInfo[] | null>(null);
  const [coQuery, setCoQuery] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outreachId, setOutreachId] = useState<string | null>(null);
  const [coldJob, setColdJob] = useState<(Job & { cold: true }) | null>(null);
  const outreachOpen = useRef(false);
  const [sheet, setSheet] = useState<null | 'tier' | 'region' | 'sort' | 'stack' | 'settings'>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void; ask?: string } | null>(null);
  const [shown, setShown] = useState({ key: '', n: PAGE });
  const [scanning, setScanning] = useState(false);
  const [push, setPush] = useState<{ state: PushState; banner: boolean }>({ state: 'loading', banner: false });
  const [pushBusy, setPushBusy] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => matchMedia(desktopQuery).matches, () => true);
  const sentinel = useRef<HTMLDivElement>(null);

  // ── Data ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await (await fetch('/api/jobs')).json();
        if (cancelled) return;
        setJobs(d.jobs || []);
        setTotal(d.stats?.total || 0);
        setLastScan(d.stats?.lastScan || null);
        setLangOpts(d.availableLanguages || []);
      } catch { /* offline: keep what we have */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => { fetch('/api/calendar').then(r => r.json()).then(setCalendar).catch(() => {}); }, []);
  useEffect(() => {
    if (tab !== 'radar' || view !== 'companies' || companies) return;
    fetch('/api/companies').then(r => r.json()).then(d => setCompanies(d.companies || [])).catch(() => {});
  }, [tab, view, companies]);
  // Locked until the outreach key is set; no follow-ups to show then.
  useEffect(() => {
    fetch('/api/outreach?outbox=1', { headers: { 'x-outreach-key': outreachKey.get() } })
      .then(r => r.ok ? r.json() : { followUps: [] }).then(d => setFollowUps(d.followUps)).catch(() => {});
  }, [outreachId, coldJob]);

  // ── Push: what this device can do, and whether it's already subscribed ──
  useEffect(() => {
    (async () => {
      const banner = store.get('jr-alert-banner') !== 'no';
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return setPush({ state: ios && !standalone ? 'ios-install' : 'unsupported', banner });
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (Notification.permission === 'denied') return setPush({ state: 'denied', banner });
      const sub = await reg.pushManager.getSubscription();
      setPush({ state: sub ? 'on' : 'off', banner });
    })().catch(() => setPush({ state: 'unsupported', banner: false }));
  }, []);

  const enablePush = async () => {
    setPushBusy(true);
    try {
      if (await Notification.requestPermission() !== 'granted') { setPush(p => ({ ...p, state: 'denied' })); return; }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch('/api/push')).json();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!r.ok) throw new Error('server refused');
      setPush(p => ({ ...p, state: 'on' }));
      setToast({ text: 'Alerts on — you should get a confirmation now' });
    } catch {
      setToast({ text: 'Couldn’t enable alerts on this browser' });
    } finally { setPushBusy(false); }
  };
  const disablePush = async () => {
    setPushBusy(true);
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe();
    }
    setPush(p => ({ ...p, state: 'off' }));
    setPushBusy(false);
  };
  const testPush = async () => {
    const d = await (await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) })).json().catch(() => ({}));
    setToast({ text: d.success ? 'Test sent to all your devices' : (d.error || 'Test failed') });
  };
  const dismissBanner = () => { store.set('jr-alert-banner', 'no'); setPush(p => ({ ...p, banner: false })); };

  // ── URL mirrors the view, so refresh / share / notification deep-links land in the same place ──
  useEffect(() => {
    const cur: Record<string, string> = { tab, level, tier, region, sort, q, co, langs: langs.join(',') };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(cur)) if (v && v !== DEFAULTS[k]) p.set(k, v);
    history.replaceState(history.state, '', p.toString() ? `?${p}` : location.pathname);
  }, [tab, level, tier, region, sort, q, co, langs]);

  // ── Derived views: everything is in memory, so filters are instant ──
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter(j => {
      if (co && j.company !== co) return false;
      // Picking a company overrides the tier filter — you asked for that company specifically.
      if (!co && (tier === 'focus' ? !FOCUS_TIERS.includes(j.tier) : tier !== 'all' && j.tier !== tier)) return false;
      if (region !== 'all' && j.region !== region) return false;
      if (langs.length && !langs.some(l => j.languages.split(',').includes(l))) return false;
      if (needle && !`${j.title} ${j.company} ${j.location || ''} ${j.notes || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [jobs, co, tier, region, langs, q]);

  const inboxBase = useMemo(() => filtered.filter(j => j.is_active === 1 && j.status === 'not_applied'), [filtered]);
  const levelCounts = useMemo(() => Object.fromEntries(LEVELS.map(l => [l.key, inboxBase.filter(j => matchesLevel(j, l.key)).length])), [inboxBase]);

  const shortlist = useMemo(() => rank(jobs.filter(j => j.is_bookmarked === 1 && j.status === 'not_applied'), 'score'), [jobs]);

  const feed = useMemo(() => {
    if (tab === 'roles') return rank(inboxBase.filter(j => matchesLevel(j, level)), sort);
    if (tab === 'today') return rank(jobs.filter(j => j.elig === 'yes' && j.status === 'not_applied' && !j.is_bookmarked && isRecent(j)), 'score');
    return [];
  }, [tab, inboxBase, jobs, level, sort]);

  const tracked = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mine = jobs.filter(j => j.status !== 'not_applied' && (!needle || `${j.title} ${j.company}`.toLowerCase().includes(needle)));
    return STATUSES.filter(s => s.key !== 'not_applied')
      .map(s => ({ ...s, jobs: mine.filter(j => j.status === s.key).sort((a, b) => parseTs(b.last_seen) - parseTs(a.last_seen)) }));
  }, [jobs, q]);

  const counts = useMemo(() => {
    const early = jobs.filter(j => j.is_active === 1 && j.status === 'not_applied' && j.elig === 'yes');
    return {
      inbox: early.length, newEarly: early.filter(isNew).length,
      tracker: jobs.filter(j => DONE.includes(j.status)).length,
      interviews: jobs.filter(j => ['oa', 'interviewing', 'offered'].includes(j.status)).length,
      india: early.filter(j => j.region === 'india').length, sg: early.filter(j => j.region === 'singapore').length,
      byCompany: early.reduce<Record<string, number>>((a, j) => { a[j.company] = (a[j.company] || 0) + 1; return a; }, {}),
    };
  }, [jobs]);

  const viewKey = `${tab}|${level}|${tier}|${region}|${sort}|${q}|${co}|${langs}`;
  const visibleCount = shown.key === viewKey ? shown.n : PAGE;
  const visible = feed.slice(0, visibleCount);
  const selected = jobs.find(j => j.id === selectedId) || null;
  const outreachJob = coldJob || jobs.find(j => j.id === outreachId) || null;

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) setShown({ key: viewKey, n: visibleCount + PAGE }); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [viewKey, visibleCount, feed.length]);

  // ── Actions (optimistic; the server write happens in the background) ──
  const persist = useCallback((id: string, body: Record<string, string>) => {
    fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
      .catch(() => setReload(r => r + 1));
  }, []);
  const patch = (id: string, p: Partial<Job>) => setJobs(js => js.map(j => j.id === id ? { ...j, ...p } : j));

  const setStatus = (job: Job, status: string, announce = true) => {
    const prev = job.status;
    patch(job.id, { status });
    persist(job.id, { action: 'status', status });
    // In the inbox the row disappears the moment it's ticked, so hand focus to the next one.
    if (tab !== 'pipeline' && status !== 'not_applied' && selectedId === job.id && isDesktop) {
      const i = visible.findIndex(j => j.id === job.id);
      setSelectedId(visible[i + 1]?.id || visible[i - 1]?.id || null);
    }
    if (announce && status !== 'not_applied') {
      setToast({
        text: `${status === 'not_interested' ? 'Hidden' : statusLabel(status)} · ${job.company}`,
        undo: () => { patch(job.id, { status: prev }); persist(job.id, { action: 'status', status: prev }); setToast(null); },
      });
    }
  };
  const tick = (job: Job, status: string) => setStatus(job, job.status === status ? 'not_applied' : status);
  const star = (job: Job) => {
    patch(job.id, { is_bookmarked: job.is_bookmarked ? 0 : 1 }); persist(job.id, { action: 'bookmark' });
    if (!job.is_bookmarked) setToast({ text: `Shortlisted · ${job.company}` });
  };
  // You're off in another tab filling the form, so this waits until you're back.
  const askApplied = (job: Job) => setToast({ text: `Applied to ${job.company}?`, ask: 'Yes', undo: () => setStatus(job, 'applied') });
  const saveNotes = (job: Job, notes: string) => { patch(job.id, { notes }); persist(job.id, { action: 'notes', notes }); };

  useEffect(() => {
    if (!toast || toast.ask) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    setToast({ text: 'Scanning 150+ career sites… (about a minute)' });
    try {
      const d = await (await fetch('/api/scan', { method: 'POST' })).json();
      setToast({ text: `Scan done · ${d.newJobsFound} new role${d.newJobsFound === 1 ? '' : 's'}` });
      setReload(r => r + 1);
      setCompanies(null);
    } catch { setToast({ text: 'Scan failed — try again in a bit' }); }
    setScanning(false);
  };

  // ── Opening a job: sheet on phones (Back closes it), pane on desktop ──
  const open = (id: string) => {
    if (!isDesktop && !selectedId) history.pushState({ sheet: 1 }, '');
    setSelectedId(id);
  };
  const close = () => { if (!isDesktop && history.state?.sheet) history.back(); else setSelectedId(null); };
  useEffect(() => {
    const onPop = () => { if (outreachOpen.current) { outreachOpen.current = false; setOutreachId(null); setColdJob(null); } else setSelectedId(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openOutreach = (id: string) => {
    if (!isDesktop) history.pushState({ outreach: 1 }, '');
    outreachOpen.current = true; setOutreachId(id);
  };
  const closeOutreach = () => {
    if (!isDesktop && history.state?.outreach) history.back(); else { outreachOpen.current = false; setOutreachId(null); setColdJob(null); }
  };
  // No posting yet (a startup that just raised, an old role that left the feed): message them anyway.
  const openCold = (company: string, url: string, id: string) => {
    setColdJob({
      id, company, title: 'Software Intern', cold: true, tier: 'startup', location: null, department: null, apply_url: url, salary_range: null,
      ats_platform: null, role_type: 'intern', languages: '', region: 'india', matched_keywords: '', min_experience: null, first_seen: '', last_seen: '',
      is_active: 1, match_score: 0, is_bookmarked: 0, status: 'not_applied', notes: '', link_status: 1, link_checked_at: null, batch_fit: '', reopened_at: null, elig: 'yes', elig_why: '',
    });
    openOutreach(id);
  };

  const goCompany = (name: string) => {
    setCo(name); setTab('roles'); setLevel('eligible'); setSelectedId(null); window.scrollTo({ top: 0 });
  };
  const switchTab = (t: Tab) => { setTab(t); setSelectedId(null); window.scrollTo({ top: 0 }); };

  // ── Keyboard (desktop): j/k move · o open posting · a applied · x hide · s save · / search ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (outreachId || coldJob) { if (e.key === 'Escape' && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') closeOutreach(); return; }
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); document.getElementById('search')?.focus(); return; }
      if (e.key === 'Escape') { if (sheet) setSheet(null); else close(); return; }
      const i = visible.findIndex(j => j.id === selectedId);
      if (e.key === 'j' || e.key === 'k') {
        const nextJob = visible[e.key === 'j' ? Math.min(visible.length - 1, i + 1) : Math.max(0, i - 1)];
        if (nextJob) { setSelectedId(nextJob.id); document.querySelector(`[data-job="${nextJob.id}"]`)?.scrollIntoView({ block: 'nearest' }); }
        return;
      }
      if (!selected) return;
      if (e.key === 'o' || e.key === 'Enter') window.open(selected.apply_url, '_blank', 'noopener');
      else if (e.key === 'a') tick(selected, 'applied');
      else if (e.key === 'x') tick(selected, 'not_interested');
      else if (e.key === 's') star(selected);
      else if (e.key === 'r') openOutreach(selected.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── Render helpers ──
  const pill = (key: 'tier' | 'region' | 'sort' | 'stack', label: string, active: boolean) => (
    <button className={`pill ${active ? 'on' : ''}`} onClick={() => setSheet(key)}>{label} <Icon name="chevron" size={14} /></button>
  );
  const optionList = (opts: Array<{ key: string; label: string }>, cur: string, set: (k: string) => void) => (
    <div className="opt-list">
      {opts.map(o => (
        <button key={o.key} className={`opt ${cur === o.key ? 'on' : ''}`} onClick={() => { set(o.key); setSheet(null); }}>
          {o.label}{cur === o.key && <Icon name="check" size={16} />}
        </button>
      ))}
    </div>
  );
  const hwFor = (company: string) => calendar.all.find(h => h.company === company);
  const alertLabel = { on: 'Alerts on', loading: 'Alerts', denied: 'Alerts blocked', unsupported: 'Alerts', off: 'Enable alerts', 'ios-install': 'Enable alerts' }[push.state];
  const newInFeed = feed.filter(isNew).length;

  const title = { today: 'Today', roles: co || 'Roles', pipeline: 'Pipeline', radar: 'Radar' }[tab];
  const subtitle = {
    today: loading ? 'Loading…' : `${feed.length} new · ${shortlist.length} shortlisted · ${followUps.length} follow-up${followUps.length === 1 ? '' : 's'}`,
    roles: loading ? 'Loading…' : `${feed.length} role${feed.length === 1 ? '' : 's'}${newInFeed ? ` · ${newInFeed} new in 24h` : ''}`,
    pipeline: `${shortlist.length} shortlisted · ${counts.tracker} applied · ${counts.interviews} in process`,
    radar: {
      signals: 'Hiring before it reaches a careers page',
      calendar: `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()} · ${calendar.activeNow.length} companies hiring now`,
      companies: companies ? `${companies.filter(c => c.scannable).length} scanned automatically · ${companies.length} tracked` : 'Loading…',
    }[view],
  }[tab];
  const nextStep = (j: Job) => (
    <div key={j.id} className={`row steps ${j.id === selectedId ? 'selected' : ''}`} data-job={j.id}>
      <button className="row-open" onClick={() => open(j.id)}>
        <Avatar company={j.company} tier={j.tier} size={32} />
        <span className="row-text"><b>{j.title}</b><span>{j.company}{j.elig_why ? ` · ${j.elig_why}` : ''}{j.is_active ? '' : ' · posting closed'}</span></span>
      </button>
      <button className="btn sm" onClick={() => openOutreach(j.id)}><Icon name="sparkle" size={14} /> Reach out</button>
      <a className="btn primary sm" href={j.apply_url} target="_blank" rel="noopener noreferrer" onClick={() => askApplied(j)}>Apply</a>
    </div>
  );

  return (
    <div className={`shell ${selected ? 'has-detail' : ''}`}>
      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
        <div className="brand"><img src="/icon-192.png" alt="" /><div><b>Job Radar</b><span>{total.toLocaleString()} roles indexed</span></div></div>
        <nav className="side-nav">
          {TABS.map(t => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => switchTab(t.key)}>
              <Icon name={t.icon} /> {t.label}
              {t.key === 'today' && counts.newEarly + followUps.length > 0 && <span className="cnt">{counts.newEarly + followUps.length}</span>}
              {t.key === 'roles' && counts.inbox > 0 && <span className="cnt">{counts.inbox}</span>}
              {t.key === 'pipeline' && shortlist.length + counts.tracker > 0 && <span className="cnt">{shortlist.length + counts.tracker}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className={`side-btn ${push.state === 'on' ? 'good' : ''}`} onClick={() => setSheet('settings')}><Icon name="bell" /> {alertLabel}</button>
          <button className="side-btn" onClick={scan} disabled={scanning}><span className={scanning ? 'spin' : ''}><Icon name="refresh" /></span> {scanning ? 'Scanning…' : 'Scan now'}</button>
          <p className="muted">{lastScan ? `Last scan ${timeAgo(lastScan)} ago` : 'Not scanned yet'}</p>
          <p className="muted keys">j/k move · s shortlist · r reach out · o open · a applied · x hide · / search</p>
        </div>
      </aside>

      {/* ── Main column ── */}
      <main className="main">
        <header className="topbar">
          <img className="topbar-logo" src="/icon-192.png" alt="" />
          <div className="topbar-text"><h1>{title}</h1><p>{subtitle}</p></div>
          <button className={`icon-btn ${push.state === 'on' ? 'good' : ''}`} onClick={() => setSheet('settings')} aria-label="Alerts & settings"><Icon name="bell" /></button>
          <button className="icon-btn" onClick={scan} disabled={scanning} aria-label="Scan now"><span className={scanning ? 'spin' : ''}><Icon name="refresh" /></span></button>
        </header>

        {(tab === 'roles' || tab === 'pipeline') && (
          <div className="controls">
            <label className="search"><Icon name="search" size={17} />
              <input id="search" type="search" placeholder={tab === 'pipeline' ? 'Search your applications' : 'Search roles, companies, notes'} value={q}
                onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur(); } }} />
            </label>
            {tab === 'roles' && (
              <div className="seg" role="tablist">
                {LEVELS.map(l => (
                  <button key={l.key} role="tab" aria-selected={level === l.key} className={level === l.key ? 'on' : ''} onClick={() => setLevel(l.key)}>
                    {l.label} <span className="cnt">{levelCounts[l.key]}</span>
                  </button>
                ))}
              </div>
            )}
            {tab === 'roles' && (
              <div className="pills">
                {co && <button className="pill on" onClick={() => setCo('')}>{co} <Icon name="x" size={14} /></button>}
                {pill('tier', TIERS.find(t => t.key === tier)?.label || 'Companies', tier !== 'all')}
                {pill('region', REGIONS.find(r => r.key === region)?.label || 'Region', region !== 'all')}
                {pill('sort', SORTS.find(s => s.key === sort)?.label || 'Sort', sort !== 'score')}
                {pill('stack', langs.length ? langs.join(', ') : 'Tech stack', langs.length > 0)}
              </div>
            )}
          </div>
        )}

        {tab === 'radar' && (
          <div className="controls"><div className="seg" role="tablist">
            {VIEWS.map(v => <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? 'on' : ''} onClick={() => setView(v.key)}>{v.label}</button>)}
          </div></div>
        )}

        {tab === 'today' && (push.state === 'off' || push.state === 'ios-install') && push.banner && (
          <div className="banner">
            <Icon name="bell" />
            <div>
              <b>Never miss a new internship</b>
              <span>{push.state === 'ios-install' ? 'On iPhone: tap Share → Add to Home Screen, open Job Radar from there, then enable alerts.' : 'Get a notification the moment a matching intern or new-grad role appears.'}</span>
            </div>
            {push.state === 'off' && <button className="btn primary sm" onClick={enablePush} disabled={pushBusy}>Enable</button>}
            <button className="icon-btn sm" onClick={dismissBanner} aria-label="Dismiss"><Icon name="x" size={16} /></button>
          </div>
        )}

        {tab === 'today' && !loading && (followUps.length > 0 || shortlist.length > 0) && (
          <section className="today">
            {followUps.length > 0 && (
              <div className="sig-due">
                <h4>{followUps.length} follow-up{followUps.length === 1 ? '' : 's'} due</h4>
                {followUps.map(f => (
                  <button key={f.id} onClick={() => (jobs.some(j => j.id === f.job_id) ? openOutreach(f.job_id) : openCold(f.company, '', f.job_id))}>{f.name} · {f.company}{f.title ? ` · ${f.title}` : ''}</button>
                ))}
              </div>
            )}
            {shortlist.length > 0 && (
              <div className="group">
                <div className="group-head">Shortlist <span className="cnt">{shortlist.length}</span></div>
                {shortlist.slice(0, 5).map(nextStep)}
                {shortlist.length > 5 && <button className="ox-link" onClick={() => switchTab('pipeline')}>See all {shortlist.length} in Pipeline</button>}
              </div>
            )}
          </section>
        )}

        {/* Feed */}
        {(tab === 'today' || tab === 'roles') && (
          <section className="feed">
            {tab === 'today' && !loading && <h2 className="sec-title">New for you</h2>}
            {loading ? [...Array(6)].map((_, i) => <div key={i} className="card skeleton"><i /><i /><i /></div>)
              : visible.length === 0 ? (
                <div className="empty">
                  <Icon name="radar" size={34} />
                  <p>{total === 0 ? 'No roles indexed yet' : tab === 'today' ? 'Nothing new in the last 3 days' : 'Nothing matches these filters'}</p>
                  <span>{total === 0 ? 'Run a scan to pull live openings.' : tab === 'today' ? 'New eligible roles land here first.' : 'Try the Unclear tab or clear your filters.'}</span>
                  {total === 0 ? <button className="btn primary" onClick={scan}>Scan now</button>
                    : tab === 'today' ? <button className="btn" onClick={() => switchTab('roles')}>See all {counts.inbox} eligible roles</button>
                      : <button className="btn" onClick={() => { setLevel('eligible'); setTier('all'); setRegion('all'); setLangs([]); setQ(''); setCo(''); }}>Reset filters</button>}
                </div>
              ) : (<>
                {visible.map(j => (
                  <JobCard key={j.id} job={j} selected={j.id === selectedId}
                    onOpen={() => open(j.id)} onTick={s => tick(j, s)} onStar={() => star(j)}
                    onOutreach={() => openOutreach(j.id)} onApply={() => askApplied(j)} />
                ))}
                <div ref={sentinel} className="feed-end">{feed.length > visible.length ? 'Loading more…' : `${feed.length} role${feed.length === 1 ? '' : 's'}`}</div>
              </>)}
          </section>
        )}

        {tab === 'radar' && view === 'signals' && <Signals onCold={openCold} />}

        {/* Pipeline */}
        {tab === 'pipeline' && (
          <section className="tracker">
            <div className="pipeline">
              <div className="stage"><b>{shortlist.length}</b><span>Shortlist</span></div>
              {tracked.filter(s => s.key !== 'not_interested').map(s => (
                <div key={s.key} className={`stage s-${s.key}`}><b>{s.jobs.length}</b><span>{s.label}</span></div>
              ))}
            </div>
            {shortlist.length > 0 && (
              <div className="group">
                <div className="group-head">Shortlist <span className="cnt">{shortlist.length}</span></div>
                {shortlist.map(nextStep)}
              </div>
            )}
            {!shortlist.length && tracked.filter(s => s.key !== 'not_interested').every(s => s.jobs.length === 0) && (
              <div className="empty"><Icon name="tracker" size={34} /><p>Nothing in progress</p><span>Tap ☆ on a role (or swipe it right) to shortlist it. Reach out, apply, then update OA / interview / offer from the role’s page.</span></div>
            )}
            {tracked.map(s => {
              if (!s.jobs.length) return null;
              const collapsed = s.key === 'not_interested' && !showHidden;
              return (
                <div key={s.key} className="group">
                  <button className="group-head" onClick={() => s.key === 'not_interested' && setShowHidden(v => !v)}>
                    {s.label} <span className="cnt">{s.jobs.length}</span>{s.key === 'not_interested' && <span className="muted"> · {collapsed ? 'show' : 'hide'}</span>}
                  </button>
                  {!collapsed && s.jobs.map(j => (
                    <button key={j.id} className={`row ${j.id === selectedId ? 'selected' : ''}`} data-job={j.id} onClick={() => open(j.id)}>
                      <Avatar company={j.company} tier={j.tier} size={32} />
                      <span className="row-text"><b>{j.title}</b><span>{j.company} · {j.is_active ? `found ${timeAgo(j.first_seen)} ago` : 'posting closed'}{j.notes ? ` · ${j.notes}` : ''}</span></span>
                    </button>
                  ))}
                </div>
              );
            })}
          </section>
        )}

        {/* Calendar */}
        {tab === 'radar' && view === 'calendar' && (
          <section className="calendar">
            {([['activeNow', 'Applications open now'], ['upcoming', 'Opening in the next 3 months']] as const).map(([key, heading]) => (
              <div key={key}>
                <h2 className="sec-title">{heading}</h2>
                <div className="cal-grid">
                  {[...calendar[key]]
                    // Focus tiers first, then wherever you have the most live roles to act on.
                    .sort((a, b) => Number(!FOCUS_TIERS.includes(a.tier)) - Number(!FOCUS_TIERS.includes(b.tier)) || (counts.byCompany[b.company] || 0) - (counts.byCompany[a.company] || 0))
                    .map(w => (
                    <div key={w.company} className={`cal-card ${key === 'activeNow' ? 'live' : ''}`}>
                      <div className="cal-head"><Avatar company={w.company} tier={w.tier} size={30} /><b>{w.company}</b><span className="muted">{TIER_LABEL[w.tier]}</span></div>
                      <div className="hw-row"><span>Internships</span><b>{w.internAppsOpen}{w.internAppsClose ? `–${w.internAppsClose}` : ''}</b></div>
                      <div className="hw-row"><span>New grad</span><b>{w.newGradOpen}{w.newGradClose ? `–${w.newGradClose}` : ''}</b></div>
                      <div className="months">{MONTHS.map((m, i) => <i key={m} title={m} className={`${w.peakMonths.includes(i + 1) ? 'peak' : ''} ${i === new Date().getMonth() ? 'now' : ''}`} />)}</div>
                      <p className="hw-notes">{w.notes}</p>
                      {counts.byCompany[w.company] ? <button className="btn ghost sm" onClick={() => goCompany(w.company)}>{counts.byCompany[w.company]} open early-career role{counts.byCompany[w.company] === 1 ? '' : 's'} →</button> : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Companies */}
        {tab === 'radar' && view === 'companies' && (
          <section className="companies">
            <label className="search"><Icon name="search" size={17} /><input type="search" placeholder="Find a company" value={coQuery} onChange={e => setCoQuery(e.target.value)} /></label>
            {!companies ? <div className="card skeleton"><i /><i /></div> : (
              <div className="co-grid">
                {companies.filter(c => c.name.toLowerCase().includes(coQuery.toLowerCase()))
                  .sort((a, b) => Number(b.scannable) - Number(a.scannable) || (counts.byCompany[b.name] || 0) - (counts.byCompany[a.name] || 0) || a.name.localeCompare(b.name))
                  .map(c => (
                    <div key={c.name} className={`co-card ${c.scannable ? '' : 'manual'}`}>
                      <Avatar company={c.name} tier={c.tier} size={34} />
                      <div className="co-text">
                        <b>{c.name}</b>
                        <span>{c.scannable ? (c.lastError ? <em className="bad">scan error</em> : <em className="ok">● auto</em>) : <em>○ check manually</em>} · {c.location}</span>
                        <span className="muted">{c.salary}{c.lastScanAt ? ` · scanned ${timeAgo(c.lastScanAt)} ago` : ''}</span>
                      </div>
                      <div className="co-actions">
                        {counts.byCompany[c.name] ? <button className="btn sm" onClick={() => goCompany(c.name)}>{counts.byCompany[c.name]} roles</button> : null}
                        <a className="icon-btn sm" href={c.careersUrl} target="_blank" rel="noopener noreferrer" aria-label={`${c.name} careers`}><Icon name="external" size={16} /></a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Detail: pane on desktop, bottom sheet on phones ── */}
      <aside className={`detail ${selected ? 'open' : ''}`}>
        {selected ? (
          <JobDetail job={selected} window={hwFor(selected.company)} sameCompany={counts.byCompany[selected.company] || 0}
            onClose={close} onStatus={s => setStatus(selected, s)} onStar={() => star(selected)}
            onNotes={n => saveNotes(selected, n)} onOutreach={() => openOutreach(selected.id)} onApply={() => askApplied(selected)} onCompany={() => goCompany(selected.company)} />
        ) : (
          <div className="detail-empty">
            <Icon name="radar" size={40} />
            <p>Select a role to see details</p>
            <div className="stat-grid">
              <div><b>{counts.inbox}</b><span>eligible now</span></div>
              <div><b>{counts.newEarly}</b><span>new in 24h</span></div>
              <div><b>{counts.india}</b><span>🇮🇳 India</span></div>
              <div><b>{counts.sg}</b><span>🇸🇬 Singapore</span></div>
              <div><b>{counts.tracker}</b><span>applied</span></div>
              <div><b>{counts.interviews}</b><span>OA / interview / offer</span></div>
            </div>
          </div>
        )}
      </aside>
      {selected && <div className="detail-scrim" onClick={close} />}

      {/* ── Bottom nav (phones) ── */}
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => switchTab(t.key)}>
            <span className="bn-icon"><Icon name={t.icon} size={22} />
              {t.key === 'today' && counts.newEarly + followUps.length > 0 && <i className="dot" />}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>{toast.ask || 'Undo'}</button>}
          {toast.ask && <button className="toast-no" onClick={() => setToast(null)}>No</button>}
        </div>
      )}

      {outreachJob && <Outreach key={outreachJob.id} job={outreachJob} onClose={closeOutreach} />}

      {/* ── Sheets ── */}
      {sheet === 'tier' && <Sheet title="Companies" onClose={() => setSheet(null)}>{optionList(TIERS, tier, setTier)}</Sheet>}
      {sheet === 'region' && <Sheet title="Where" onClose={() => setSheet(null)}>{optionList(REGIONS, region, setRegion)}</Sheet>}
      {sheet === 'sort' && <Sheet title="Sort by" onClose={() => setSheet(null)}>{optionList(SORTS, sort, setSort)}</Sheet>}
      {sheet === 'stack' && (
        <Sheet title="Tech stack" onClose={() => setSheet(null)}>
          <p className="muted">Show roles that mention any of:</p>
          <div className="chip-cloud">
            {langOpts.slice(0, 16).map(l => (
              <button key={l.language} className={`chip ${langs.includes(l.language) ? 'on' : ''}`}
                onClick={() => setLangs(p => p.includes(l.language) ? p.filter(x => x !== l.language) : [...p, l.language])}>
                {l.language} <span className="cnt">{l.count}</span>
              </button>
            ))}
          </div>
          <div className="sheet-foot">
            <button className="btn" onClick={() => setLangs([])}>Clear</button>
            <button className="btn primary" onClick={() => setSheet(null)}>Done</button>
          </div>
        </Sheet>
      )}
      {sheet === 'settings' && (
        <Sheet title="Alerts & settings" onClose={() => setSheet(null)}>
          <div className="setting">
            <div><b>Push alerts on this device</b>
              <span>{{
                on: 'On. You get a notification when new intern / new-grad roles appear (checked every 30 min).',
                off: 'Free, no app or account needed — just allow notifications.',
                denied: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.',
                'ios-install': 'On iPhone, alerts need the app on your Home Screen: tap Share → Add to Home Screen, open it from there, then enable.',
                unsupported: 'This browser can’t receive web push. Chrome, Edge, Firefox and Safari (16.4+) can.',
                loading: 'Checking…',
              }[push.state]}</span>
            </div>
            {push.state === 'off' && <button className="btn primary" onClick={enablePush} disabled={pushBusy}>{pushBusy ? 'Enabling…' : 'Enable'}</button>}
            {push.state === 'on' && <div className="setting-btns"><button className="btn" onClick={testPush}>Send test</button><button className="btn ghost" onClick={disablePush} disabled={pushBusy}>Turn off</button></div>}
          </div>
          <div className="setting">
            <div><b>Scan now</b><span>{lastScan ? `Last scan ${timeAgo(lastScan)} ago.` : 'Never scanned.'} Scans also run automatically every 30 minutes.</span></div>
            <button className="btn" onClick={() => { setSheet(null); scan(); }} disabled={scanning}>{scanning ? 'Scanning…' : 'Scan'}</button>
          </div>
          <div className="setting">
            <div><b>Export</b><span>Every indexed role with your statuses and notes, as CSV.</span></div>
            <a className="btn" href="/api/export" download><Icon name="download" size={16} /> CSV</a>
          </div>
        </Sheet>
      )}
    </div>
  );
}
