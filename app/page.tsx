'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Job {
  id: string; company: string; tier: string; title: string;
  location: string | null; department: string | null;
  apply_url: string; salary_range: string | null;
  ats_platform: string | null; role_type: string; languages: string;
  region: string; matched_keywords: string; min_experience: number | null;
  first_seen: string; last_seen: string;
  is_active: number; match_score: number; is_bookmarked: number;
  status: string; notes: string;
  link_status: number; link_checked_at: string | null;
}
interface Stats {
  active: number; total: number; bookmarked: number; applied: number;
  newToday: number; deadLinks: number; interns: number; newgrad: number;
  india: number; singapore: number; lastScan: string | null;
}
interface LangOpt { language: string; count: number; }
interface HiringWindow {
  company: string; tier: string;
  internAppsOpen: string; internAppsClose: string;
  newGradOpen: string; newGradClose: string;
  peakMonths: number[]; hiringStyle: string; notes: string;
}
interface CompanyInfo {
  name: string; tier: string; location: string; salary: string;
  careersUrl: string; ats: string; scannable: boolean; verified: string | null;
  lastScanAt: string | null; lastError: string | null;
  totalJobs: number | null; lastNewJobAt: string | null;
}

const TIERS = [
  { key: 'all', label: 'All' }, { key: 'quant', label: 'Quant' },
  { key: 'faang', label: 'Big Tech' }, { key: 'ai', label: 'AI' },
  { key: 'product', label: 'Product' }, { key: 'banking', label: 'Banking' },
  { key: 'semi', label: 'Hardware' }, { key: 'startup', label: 'Startup' },
];
const VIEWS = [
  { key: 'active', label: 'Active' }, { key: 'all', label: 'All' },
  { key: 'bookmarked', label: 'Starred' }, { key: 'applied', label: 'Applied' },
  { key: 'expired', label: 'Expired' },
];
const ROLE_TYPES = [
  { key: 'all', label: 'All Roles' }, { key: 'intern', label: 'Internship' },
  { key: 'newgrad', label: 'New Grad' }, { key: 'fulltime', label: 'Full-time' },
];
const REGIONS = [
  { key: 'all', label: 'Everywhere' }, { key: 'india', label: '🇮🇳 India' },
  { key: 'singapore', label: '🇸🇬 Singapore' }, { key: 'remote', label: '🌐 Remote' },
];
const STATUS_OPTIONS = [
  { key: 'not_applied', label: 'Not Applied', color: 'var(--text-4)' },
  { key: 'applied', label: 'Applied', color: 'var(--accent)' },
  { key: 'oa', label: 'OA', color: 'var(--yellow)' },
  { key: 'interviewing', label: 'Interview', color: 'var(--orange)' },
  { key: 'offered', label: 'Offered', color: 'var(--green)' },
  { key: 'rejected', label: 'Rejected', color: 'var(--red)' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d.includes('T') ? d : d + 'Z').getTime()) / 1000);
  if (s < 60) return 'now'; if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}
function isNew24h(d: string): boolean {
  return Date.now() - new Date(d.includes('T') ? d : d + 'Z').getTime() < 86400000;
}
function scoreClass(s: number) { return s >= 0.6 ? 'high' : s >= 0.3 ? 'mid' : 'low'; }
const regionFlag = (r: string) => r === 'singapore' ? '🇸🇬' : r === 'remote' ? '🌐' : r === 'india' ? '🇮🇳' : '';

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const FILTER_DEFAULTS: Record<string, string> = { tier: 'all', view: 'active', roleType: 'all', region: 'all', q: '', langs: '', sort: 'score', order: 'desc' };

function readUrlFilters(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of Object.keys(FILTER_DEFAULTS)) {
    const v = p.get(k); if (v) out[k] = v;
  }
  return out;
}

export default function Home() {
  const urlInit = useMemo(() => readUrlFilters(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, total: 0, bookmarked: 0, applied: 0, newToday: 0, deadLinks: 0, interns: 0, newgrad: 0, india: 0, singapore: 0, lastScan: null });
  const [tier, setTier] = useState(urlInit.tier || 'all');
  const [view, setView] = useState(urlInit.view || 'active');
  const [search, setSearch] = useState(urlInit.q || '');
  const [debouncedSearch, setDebouncedSearch] = useState(urlInit.q || '');
  const [roleType, setRoleType] = useState(urlInit.roleType || 'all');
  const [region, setRegion] = useState(urlInit.region || 'all');
  const [selectedLangs, setSelectedLangs] = useState<string[]>(urlInit.langs ? urlInit.langs.split(',') : []);
  const [availableLangs, setAvailableLangs] = useState<LangOpt[]>([]);
  const [sort, setSort] = useState(urlInit.sort || 'score');
  const [order, setOrder] = useState(urlInit.order || 'desc');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; newJobsFound: number } | null>(null);
  const [calendar, setCalendar] = useState<{ activeNow: HiringWindow[]; upcoming: HiringWindow[] }>({ activeNow: [], upcoming: [] });
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showCount, setShowCount] = useState(50);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [notifChannels, setNotifChannels] = useState<{ telegram: boolean; ntfy: boolean } | null>(null);
  const [notifTesting, setNotifTesting] = useState(false);
  const [notifResult, setNotifResult] = useState<string | null>(null);

  // Debounce search input → one fetch, no double-fire
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick(t => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ tier, view, search: debouncedSearch, roleType, region, sort, order });
        if (selectedLangs.length > 0) params.set('languages', selectedLangs.join(','));
        const res = await fetch(`/api/jobs?${params}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setJobs(data.jobs || []);
        if (data.stats) setStats(data.stats);
        setAvailableLangs(data.availableLanguages || []);
        setLoading(false);
      } catch { /* network error */ }
    })();
    return () => { cancelled = true; };
  }, [tier, view, debouncedSearch, roleType, region, selectedLangs, sort, order, refreshTick]);

  // Keep filters in the URL (shareable / survives refresh)
  useEffect(() => {
    const p = new URLSearchParams();
    const state: Record<string, string> = { tier, view, roleType, region, q: debouncedSearch, langs: selectedLangs.join(','), sort, order };
    for (const [k, v] of Object.entries(state)) {
      if (v && v !== FILTER_DEFAULTS[k]) p.set(k, v);
    }
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [tier, view, roleType, region, debouncedSearch, selectedLangs, sort, order]);

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(d => setCalendar(d)).catch(() => {});
    fetch('/api/notify/test').then(r => r.json()).then(d => setNotifChannels(d.channels)).catch(() => {});
  }, []);

  const fetchCompanies = useCallback(() => {
    fetch('/api/companies').then(r => r.json()).then(d => setCompanies(d.companies || [])).catch(() => {});
  }, []);
  useEffect(() => { if (showCoverage && companies.length === 0) fetchCompanies(); }, [showCoverage, companies.length, fetchCompanies]);

  useEffect(() => {
    if (!scanResult) return;
    const t = setTimeout(() => setScanResult(null), 8000);
    return () => clearTimeout(t);
  }, [scanResult]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('.search-wrap input')?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const startScan = async () => {
    setScanning(true); setScanResult(null);
    try {
      const r = await fetch('/api/scan', { method: 'POST' });
      const d = await r.json();
      setScanResult(d);
      refresh();
      if (showCoverage) fetchCompanies();
    } catch { }
    setScanning(false);
  };

  const testNotifications = async () => {
    setNotifTesting(true); setNotifResult(null);
    try {
      const r = await fetch('/api/notify/test', { method: 'POST' });
      const d = await r.json();
      if (d.success) setNotifResult('Sent! Check your phone.');
      else setNotifResult(d.error || 'No channel configured');
    } catch { setNotifResult('Failed'); }
    setNotifTesting(false);
    setTimeout(() => setNotifResult(null), 6000);
  };

  const act = async (id: string, action: string, extra?: Record<string, string>) => {
    await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, ...extra }) });
    refresh();
  };

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(order === 'desc' ? 'asc' : 'desc');
    else { setSort(col); setOrder('desc'); }
  };

  const toggleLang = (lang: string) => setSelectedLangs(p => p.includes(lang) ? p.filter(l => l !== lang) : [...p, lang]);

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id); setTimeout(() => setCopied(null), 1500);
  };

  const clearFilters = () => {
    setTier('all'); setView('active'); setSearch(''); setRoleType('all'); setRegion('all');
    setSelectedLangs([]); setSort('score'); setOrder('desc'); setShowCount(50);
  };

  const hasFilters = tier !== 'all' || view !== 'active' || search || roleType !== 'all' || region !== 'all' || selectedLangs.length > 0;

  const tierCounts = jobs.reduce<Record<string, number>>((a, j) => { a[j.tier] = (a[j.tier] || 0) + 1; return a; }, {});
  const visibleJobs = jobs.slice(0, showCount);
  const currentMonth = new Date().getMonth() + 1;
  const sortArrow = (col: string) => sort === col ? (order === 'desc' ? '↓' : '↑') : '';

  const openJob = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const notifConfigured = notifChannels && (notifChannels.telegram || notifChannels.ntfy);

  return (
    <main className="app" onClick={() => setStatusDropdown(null)}>
      <div className="bg-glow" />

      <header className="header">
        <div className="logo">
          <div className="logo-mark">JR</div>
          <div className="logo-text">
            <h1>Job Radar</h1>
            <span>{stats.total.toLocaleString()} jobs indexed{stats.lastScan ? ` · Last scan ${timeAgo(stats.lastScan)}` : ''}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="search-wrap">
            <SearchIcon />
            <input type="text" placeholder="Search jobs... ( / )" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); (e.target as HTMLInputElement).blur(); } }} />
          </div>
          <button className={`btn-sm notif-btn ${notifConfigured ? 'configured' : ''}`} onClick={testNotifications} disabled={notifTesting}
            title={notifConfigured ? 'Alerts active — click to send a test' : 'Set TELEGRAM_BOT_TOKEN/NTFY_TOPIC env vars to get alerts'}>
            {notifResult || (notifTesting ? 'Sending…' : notifConfigured ? '🔔 Alerts on' : '🔕 Alerts off')}
          </button>
          <a href="/api/export" className="btn-sm" download>Export</a>
          <button className="btn-primary" onClick={startScan} disabled={scanning}>
            {scanning ? <span className="scanning-pulse">Scanning…</span> : 'Scan All'}
          </button>
        </div>
      </header>

      {(scanResult || scanning) && (
        <div className="scan-bar">
          <span className="label">{scanning ? 'Scanning 75+ career portals (takes ~1 min)…' : `Done · ${scanResult?.scanned} companies scanned`}</span>
          <div className="scan-track"><div className={`scan-fill ${scanning ? 'scanning-pulse' : ''}`} style={{ width: scanning ? '60%' : '100%' }} /></div>
          {scanResult && <span className="result">+{scanResult.newJobsFound} new</span>}
          {scanResult && <button className="scan-dismiss" onClick={() => setScanResult(null)}>&times;</button>}
        </div>
      )}

      <div className="stats-row">
        {[
          { v: stats.active, l: 'Active' }, { v: stats.newToday, l: 'New Today' },
          { v: `${stats.interns} / ${stats.newgrad}`, l: 'Intern / New Grad' },
          { v: `${stats.india} / ${stats.singapore}`, l: '🇮🇳 India / 🇸🇬 SG' },
          { v: stats.applied, l: 'Applied' },
        ].map((s, i) => (
          <div key={i} className="stat-cell">
            <div className="stat-val">{typeof s.v === 'number' ? s.v.toLocaleString() : s.v}</div>
            <div className="stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="filters-section">
        <div className="toolbar">
          <div className="tier-tabs">
            {TIERS.map(t => (
              <button key={t.key} className={`tier-tab ${tier === t.key ? 'active' : ''}`} onClick={() => setTier(t.key)}>
                {t.label}{t.key !== 'all' && tierCounts[t.key] ? <span className="cnt">{tierCounts[t.key]}</span> : null}
              </button>
            ))}
          </div>
          <div className="view-tabs">
            {VIEWS.map(v => (
              <button key={v.key} className={`view-tab ${view === v.key ? 'active' : ''}`} onClick={() => setView(v.key)}>{v.label}</button>
            ))}
          </div>
        </div>
        <div className="role-filters">
          <span className="filter-label">Role</span>
          <div className="role-tabs">
            {ROLE_TYPES.map(r => (
              <button key={r.key} className={`role-tab ${roleType === r.key ? 'active' : ''}`} onClick={() => setRoleType(r.key)}>{r.label}</button>
            ))}
          </div>
          <span className="filter-label" style={{ marginLeft: 8 }}>Where</span>
          <div className="role-tabs">
            {REGIONS.map(r => (
              <button key={r.key} className={`role-tab ${region === r.key ? 'active' : ''}`} onClick={() => setRegion(r.key)}>{r.label}</button>
            ))}
          </div>
          {availableLangs.length > 0 && (<>
            <span className="filter-label" style={{ marginLeft: 8 }}>Stack</span>
            <div className="lang-filters">
              {availableLangs.slice(0, 12).map(l => (
                <button key={l.language} className={`lang-pill ${selectedLangs.includes(l.language) ? 'active' : ''}`}
                  onClick={() => toggleLang(l.language)}>
                  {l.language} <span className="lang-cnt">{l.count}</span>
                </button>
              ))}
            </div>
          </>)}
          {hasFilters && <button className="btn-clear" onClick={clearFilters}>Clear all</button>}
        </div>
      </div>

      {/* Job Table */}
      <div className="jobs-table">
        <div className="table-header">
          <span></span><span></span>
          <span className="sortable" onClick={() => toggleSort('title')}>Role {sortArrow('title')}</span>
          <span>Type</span>
          <span className="sortable" onClick={() => toggleSort('company')}>Company {sortArrow('company')}</span>
          <span>Salary</span>
          <span className="sortable" onClick={() => toggleSort('score')}>Score {sortArrow('score')}</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading && jobs.length === 0 ? (
          <div className="skeleton-rows">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton-row"><div className="skeleton-bar" /><div className="skeleton-bar short" /></div>)}
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="jobs-empty">
            <p>{stats.total === 0 ? 'No jobs indexed yet.' : 'No jobs match filters.'}</p>
            <p>{stats.total === 0 ? 'Click "Scan All" to fetch live openings from 75+ career portals.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (<>
          {visibleJobs.map(job => {
            const pct = Math.round(job.match_score * 100);
            const st = STATUS_OPTIONS.find(s => s.key === job.status) || STATUS_OPTIONS[0];
            const keywords = (job.matched_keywords || '').split(',').filter(Boolean).slice(0, 5);
            return (
              <div key={job.id}
                className={`job-row ${job.status !== 'not_applied' ? 'is-tracked' : ''} ${!job.is_active ? 'is-expired' : ''}`}
                onClick={() => openJob(job.apply_url)}
                title="Click to open application page"
              >
                <div className={`bkm ${job.is_bookmarked ? 'on' : ''}`}
                  onClick={e => { e.stopPropagation(); act(job.id, 'bookmark'); }}
                  title={job.is_bookmarked ? 'Unstar' : 'Star'}>
                  {job.is_bookmarked ? '★' : '☆'}
                </div>
                <span className={`link-dot ${job.link_status === 1 ? 'live' : job.link_status === 0 ? 'dead' : 'unknown'}`}
                  title={job.link_status === 1 ? 'Link OK' : job.link_status === 0 ? 'Dead link' : 'Unchecked'} />
                <div className="job-main" onClick={e => e.stopPropagation()}>
                  <div className="job-title-row">
                    {isNew24h(job.first_seen) && job.is_active === 1 && <span className="new-badge">NEW</span>}
                    <span className="job-title" title={job.title} onClick={() => openJob(job.apply_url)} style={{ cursor: 'pointer' }}>{job.title}</span>
                    <button className="copy-btn" onClick={e => { e.stopPropagation(); copyUrl(job.apply_url, job.id); }} title="Copy link">
                      {copied === job.id ? '✓' : '⎘'}
                    </button>
                  </div>
                  <div className="job-loc">
                    {regionFlag(job.region)} {[job.location, job.department].filter(Boolean).join(' · ') || '—'} · {timeAgo(job.first_seen)}
                    {job.min_experience !== null && job.min_experience >= 2 && <span className="exp-badge" title="Minimum experience mentioned in JD">{job.min_experience}+ yrs</span>}
                  </div>
                  {keywords.length > 0 && (
                    <div className="kw-row" title="Why this matched your profile">
                      {keywords.map(k => <span key={k} className="kw-chip">{k}</span>)}
                    </div>
                  )}
                  {editingNotes === job.id ? (
                    <div className="notes-edit" onClick={e => e.stopPropagation()}>
                      <input type="text" value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
                        placeholder="Add a note..." autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') { act(job.id, 'notes', { notes: notesDraft }); setEditingNotes(null); } if (e.key === 'Escape') setEditingNotes(null); }}
                        onBlur={() => { act(job.id, 'notes', { notes: notesDraft }); setEditingNotes(null); }} />
                    </div>
                  ) : (
                    <div className="notes-display" onClick={e => { e.stopPropagation(); setEditingNotes(job.id); setNotesDraft(job.notes || ''); }}>
                      {job.notes ? <span className="note-text">{job.notes}</span> : <span className="note-add">+ note</span>}
                    </div>
                  )}
                </div>
                <span className={`role-badge ${job.role_type}`}>
                  {job.role_type === 'intern' ? 'Intern' : job.role_type === 'newgrad' ? 'New Grad' : 'FTE'}
                </span>
                <span className={`tier-badge ${job.tier}`}>{job.company}</span>
                <span className="job-salary">{job.salary_range || '—'}</span>
                <span className={`job-score ${scoreClass(job.match_score)}`}>{pct}%</span>
                <div className="status-cell" onClick={e => { e.stopPropagation(); setStatusDropdown(statusDropdown === job.id ? null : job.id); }}>
                  <span className="status-badge" style={{ borderColor: st.color, color: st.color }}>{st.label}</span>
                  {statusDropdown === job.id && (
                    <div className="status-dropdown" onClick={e => e.stopPropagation()}>
                      {STATUS_OPTIONS.map(s => (
                        <div key={s.key} className={`status-option ${job.status === s.key ? 'active' : ''}`}
                          style={{ color: s.color }} onClick={() => { act(job.id, 'status', { status: s.key }); setStatusDropdown(null); }}>
                          {s.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="apply-link" onClick={e => e.stopPropagation()}>
                  Apply&rarr;
                </a>
              </div>
            );
          })}
          {jobs.length > showCount && (
            <div className="load-more">
              <button className="btn-sm" onClick={() => setShowCount(s => s + 50)}>Load more ({jobs.length - showCount} remaining)</button>
            </div>
          )}
          <div className="table-footer">Showing {Math.min(showCount, jobs.length)} of {jobs.length}</div>
        </>)}
      </div>

      {/* Coverage panel */}
      <div className="section-header">
        <span>Company Coverage <span className="sub" style={{ marginLeft: 8 }}>Which career portals are scanned & how they&apos;re doing</span></span>
        <button className="btn-sm" onClick={() => setShowCoverage(!showCoverage)}>{showCoverage ? 'Hide' : 'Show'}</button>
      </div>
      {showCoverage && (
        <div className="coverage-section">
          <div className="coverage-grid">
            {companies.map(c => (
              <a key={c.name} href={c.careersUrl} target="_blank" rel="noopener noreferrer"
                className={`cov-card ${!c.scannable ? 'link-only' : c.lastError ? 'has-error' : ''}`}>
                <div className="cov-head">
                  <span className="cov-name">{c.name}</span>
                  <span className={`tier-badge ${c.tier}`} style={{ fontSize: 9, padding: '1px 5px' }}>{c.tier}</span>
                </div>
                <div className="cov-meta">
                  {c.scannable ? (
                    c.lastError
                      ? <span className="cov-err" title={c.lastError}>⚠ scan error</span>
                      : <span className="cov-ok">● auto-scanned{c.totalJobs !== null ? ` · ${c.totalJobs} matched` : ''}</span>
                  ) : (
                    <span className="cov-manual">○ check manually</span>
                  )}
                  {c.lastScanAt && <span className="cov-time">{timeAgo(c.lastScanAt)}</span>}
                </div>
                <div className="cov-loc">{c.location} · {c.salary}</div>
              </a>
            ))}
          </div>
          <p className="coverage-note">
            ● = jobs pulled automatically from the company&apos;s ATS API. ○ = no public API (Google, Meta, Goldman…) — click the card to open their careers page; the hiring calendar below tells you when it matters.
          </p>
        </div>
      )}

      {/* Hiring Calendar */}
      <div className="section-header">
        <span>Hiring Calendar <span className="sub" style={{ marginLeft: 8 }}>When to apply · {MONTHS[currentMonth - 1]} {new Date().getFullYear()}</span></span>
        <button className="btn-sm" onClick={() => setShowCalendar(!showCalendar)}>{showCalendar ? 'Hide' : 'Show'}</button>
      </div>
      {showCalendar && (
        <div className="calendar-section">
          {calendar.activeNow.length > 0 && (
            <div className="calendar-group">
              <h3 className="calendar-group-title active-label">Open Now — Apply Immediately</h3>
              <div className="calendar-grid">
                {calendar.activeNow.map(w => (
                  <div key={w.company} className="cal-card active-card">
                    <div className="cal-head">
                      <span className="cal-company">{w.company}</span>
                      <span className={`tier-badge ${w.tier}`} style={{ fontSize: 9, padding: '1px 5px' }}>{w.tier}</span>
                    </div>
                    <div className="cal-windows">
                      <div className="cal-window"><span className="cal-type">Intern:</span><span className="cal-range">{w.internAppsOpen}{w.internAppsClose ? ` – ${w.internAppsClose}` : ''}</span></div>
                      <div className="cal-window"><span className="cal-type">New Grad:</span><span className="cal-range">{w.newGradOpen}{w.newGradClose ? ` – ${w.newGradClose}` : ''}</span></div>
                    </div>
                    <div className="cal-months">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <div key={m} className={`cal-month ${w.peakMonths.includes(m) ? 'peak' : ''} ${m === currentMonth ? 'now' : ''}`} title={MONTHS[m - 1]} />
                      ))}
                    </div>
                    <div className="cal-notes">{w.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {calendar.upcoming.length > 0 && (
            <div className="calendar-group">
              <h3 className="calendar-group-title upcoming-label">Opening Soon — Prepare Now</h3>
              <div className="calendar-grid">
                {calendar.upcoming.slice(0, 18).map(w => (
                  <div key={w.company} className="cal-card">
                    <div className="cal-head">
                      <span className="cal-company">{w.company}</span>
                      <span className={`tier-badge ${w.tier}`} style={{ fontSize: 9, padding: '1px 5px' }}>{w.tier}</span>
                    </div>
                    <div className="cal-windows">
                      <div className="cal-window"><span className="cal-type">Intern:</span><span className="cal-range">{w.internAppsOpen}{w.internAppsClose ? ` – ${w.internAppsClose}` : ''}</span></div>
                      <div className="cal-window"><span className="cal-type">New Grad:</span><span className="cal-range">{w.newGradOpen}{w.newGradClose ? ` – ${w.newGradClose}` : ''}</span></div>
                    </div>
                    <div className="cal-months">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <div key={m} className={`cal-month ${w.peakMonths.includes(m) ? 'peak' : ''} ${m === currentMonth ? 'now' : ''}`} title={MONTHS[m - 1]} />
                      ))}
                    </div>
                    <div className="cal-notes">{w.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
