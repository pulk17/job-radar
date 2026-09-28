'use client';
import { useRef, useState, type ReactNode } from 'react';

export interface Job {
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

export interface HiringWindow {
  company: string; tier: string;
  internAppsOpen: string; internAppsClose: string;
  newGradOpen: string; newGradClose: string;
  peakMonths: number[]; hiringStyle: string; notes: string;
}

export const TIER_LABEL: Record<string, string> = {
  faang: 'Big Tech', startup: 'Startup', product: 'Product', ai: 'AI Lab',
  quant: 'Quant', banking: 'Finance', semi: 'Hardware',
};

export const STATUSES = [
  { key: 'not_applied', label: 'Not applied' },
  { key: 'applied', label: 'Applied' },
  { key: 'oa', label: 'Online assessment' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offered', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'not_interested', label: 'Not interested' },
];
export const statusLabel = (k: string) => STATUSES.find(s => s.key === k)?.label || k;

export function parseTs(d: string): number {
  return new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z').getTime();
}
export function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - parseTs(d)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}
export const isNew = (j: Job) => j.is_active === 1 && Date.now() - parseTs(j.first_seen) < 86400000;
export const levelLabel = (j: Job) =>
  j.role_type === 'intern' ? 'Intern' : j.role_type === 'newgrad' ? 'New grad'
    : j.min_experience === null ? 'Open level' : `${j.min_experience}+ yrs`;
/** Company salary bands are per country (₹ for India, S$ for Singapore) — don't show one on the other's jobs. */
export const payFor = (j: Job) => {
  const s = j.salary_range || '';
  if ((j.region === 'singapore' && s.startsWith('₹')) || (j.region === 'india' && s.startsWith('S$'))) return '';
  return s;
};
const flag = (r: string) => r === 'singapore' ? '🇸🇬' : r === 'remote' ? '🌐' : r === 'india' ? '🇮🇳' : '';
const shortLoc = (l: string | null) => (l || '').split(/[;|]/)[0].replace(/\s*\(India\/Singapore\)/, '').trim();

// ── Icons (lucide-style strokes) ──
const PATHS: Record<string, ReactNode> = {
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 18.5 5.5" /></>,
  star: <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  tracker: <><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" /><path d="M21 3v5h-5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  external: <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  back: <path d="m15 18-6-6 6-6" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
};
export function Icon({ name, size = 18, fill = false }: { name: string; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>
  );
}

export function Avatar({ company, tier, size = 36 }: { company: string; tier: string; size?: number }) {
  return <span className={`avatar t-${tier}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>{company.replace(/[^A-Za-z0-9]/g, '')[0] || '?'}</span>;
}

// ── Job card: tap to open, swipe right = applied, swipe left = not interested ──
export function JobCard({ job, selected, onOpen, onTick, onStar }: {
  job: Job; selected: boolean;
  onOpen: () => void; onTick: (status: string) => void; onStar: () => void;
}) {
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; active: boolean; locked: boolean } | null>(null);
  const kw = (job.matched_keywords || '').split(',').filter(Boolean)
    .filter(k => !/intern|new grad|graduate|software engineer|developer|sde|swe/.test(k)).slice(0, 3);
  const pct = Math.round(job.match_score * 100);
  const THRESHOLD = 90;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;   // swipe is a touch gesture; desktop has buttons + keys
    drag.current = { x: e.clientX, y: e.clientY, active: false, locked: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.locked) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    // Decide once whether this is a horizontal swipe or a vertical scroll.
    if (!d.active) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { d.locked = true; return; }
      if (Math.abs(mx) < 10) return;
      d.active = true;
    }
    setDx(Math.max(-160, Math.min(160, mx)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    if (dx > THRESHOLD) onTick('applied');
    else if (dx < -THRESHOLD) onTick('not_interested');
    setDx(0);
  };

  return (
    <div className={`card-wrap ${dx > THRESHOLD ? 'arm-right' : dx < -THRESHOLD ? 'arm-left' : ''}`}>
      <div className="swipe-bg left"><Icon name="check" /> Applied</div>
      <div className="swipe-bg right">Not interested <Icon name="x" /></div>
      <article
        className={`card ${selected ? 'selected' : ''} ${job.is_active ? '' : 'expired'} ${dx ? 'dragging' : ''}`}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClick={() => { if (!dx) onOpen(); }}
        data-job={job.id}
      >
        <div className="card-head">
          <Avatar company={job.company} tier={job.tier} />
          <div className="card-co">
            <span className="co-name">{job.company}</span>
            <span className="co-meta">{TIER_LABEL[job.tier]}{payFor(job) ? ` · ${payFor(job)}` : ''}</span>
          </div>
          <span className={`score ${pct >= 60 ? 'hi' : pct >= 35 ? 'mid' : 'lo'}`} title="Match score">{pct}</span>
        </div>
        <h3 className="card-title">{job.title}</h3>
        <div className="card-meta">
          <span className={`lvl lvl-${job.role_type === 'fulltime' ? (job.min_experience === null ? 'open' : 'exp') : job.role_type}`}>{levelLabel(job)}</span>
          {isNew(job) && <span className="new">New</span>}
          {!job.is_active && <span className="gone">Closed</span>}
          {job.status !== 'not_applied' && <span className="st">{statusLabel(job.status)}</span>}
          <span className="where">{flag(job.region)} {shortLoc(job.location)}</span>
          <span className="ago">{timeAgo(job.first_seen)}</span>
        </div>
        {kw.length > 0 && <div className="kw">{kw.map(k => <span key={k}>{k}</span>)}</div>}
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className={`act ${job.is_bookmarked ? 'on star' : ''}`} onClick={onStar} aria-label={job.is_bookmarked ? 'Unsave' : 'Save'}>
            <Icon name="star" fill={!!job.is_bookmarked} />
          </button>
          <button className={`act ${job.status === 'applied' ? 'on ok' : ''}`} onClick={() => onTick('applied')} aria-label="Mark applied">
            <Icon name="check" /><span>Applied</span>
          </button>
          <button className={`act ${job.status === 'not_interested' ? 'on no' : ''}`} onClick={() => onTick('not_interested')} aria-label="Not interested">
            <Icon name="x" /><span>Hide</span>
          </button>
          <a className="apply" href={job.apply_url} target="_blank" rel="noopener noreferrer">Apply <Icon name="external" size={15} /></a>
        </div>
      </article>
    </div>
  );
}

// ── Detail: bottom sheet on phones, right-hand pane on desktop ──
export function JobDetail({ job, window: hw, sameCompany, onClose, onStatus, onStar, onNotes, onCompany }: {
  job: Job; window?: HiringWindow; sameCompany: number;
  onClose: () => void; onStatus: (s: string) => void; onStar: () => void;
  onNotes: (n: string) => void; onCompany: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const kw = (job.matched_keywords || '').split(',').filter(Boolean);
  const langs = (job.languages || '').split(',').filter(Boolean);
  return (
    <div className="detail-inner">
      <div className="grabber" />
      <div className="detail-top">
        <button className="icon-btn only-sheet" onClick={onClose} aria-label="Close"><Icon name="back" /></button>
        <Avatar company={job.company} tier={job.tier} size={44} />
        <div className="card-co">
          <span className="co-name big">{job.company}</span>
          <span className="co-meta">{TIER_LABEL[job.tier]}{payFor(job) ? ` · est. ${payFor(job)}` : ''}</span>
        </div>
        <button className={`icon-btn ${job.is_bookmarked ? 'star-on' : ''}`} onClick={onStar} aria-label="Save"><Icon name="star" fill={!!job.is_bookmarked} /></button>
      </div>

      <h2 className="detail-title">{job.title}</h2>
      <div className="card-meta">
        <span className={`lvl lvl-${job.role_type === 'fulltime' ? (job.min_experience === null ? 'open' : 'exp') : job.role_type}`}>{levelLabel(job)}</span>
        {job.min_experience !== null && job.role_type !== 'fulltime' && <span className="st">{job.min_experience === 0 ? 'No experience needed' : `${job.min_experience} yr asked`}</span>}
        {!job.is_active && <span className="gone">Posting closed</span>}
        {job.link_status === 0 && <span className="gone">Link looks dead</span>}
      </div>
      <p className="detail-loc"><Icon name="pin" size={15} /> {job.location || '—'}{job.department ? ` · ${job.department}` : ''}</p>
      <p className="detail-sub">Found {timeAgo(job.first_seen)} ago · {Math.round(job.match_score * 100)}% match</p>

      <div className="detail-cta">
        <a className="btn primary" href={job.apply_url} target="_blank" rel="noopener noreferrer"><span className="ellip">Apply on {job.company}</span> <Icon name="external" size={16} /></a>
        <button className="btn" onClick={() => { navigator.clipboard?.writeText(job.apply_url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <section className="detail-sec">
        <h4>Status</h4>
        <div className="status-grid">
          {STATUSES.map(s => (
            <button key={s.key} className={`status-opt s-${s.key} ${job.status === s.key ? 'on' : ''}`} onClick={() => onStatus(s.key)}>{s.label}</button>
          ))}
        </div>
      </section>

      {(kw.length > 0 || langs.length > 0) && (
        <section className="detail-sec">
          <h4>Why it matched</h4>
          <div className="kw wrap">{[...new Map([...langs, ...kw].map(k => [k.toLowerCase(), k])).values()].map(k => <span key={k}>{k}</span>)}</div>
        </section>
      )}

      <section className="detail-sec">
        <h4>Notes</h4>
        <textarea key={job.id} defaultValue={job.notes} placeholder="Referral contact, OA date, what to prep…" rows={3}
          onBlur={e => { if (e.target.value !== job.notes) onNotes(e.target.value); }} />
      </section>

      {hw && (
        <section className="detail-sec">
          <h4>When {job.company} hires</h4>
          <div className="hw-row"><span>Internships</span><b>{hw.internAppsOpen}{hw.internAppsClose ? `–${hw.internAppsClose}` : ''}</b></div>
          <div className="hw-row"><span>New grad</span><b>{hw.newGradOpen}{hw.newGradClose ? `–${hw.newGradClose}` : ''}</b></div>
          <p className="hw-notes">{hw.notes}</p>
        </section>
      )}

      {sameCompany > 1 && (
        <button className="btn ghost wide" onClick={onCompany}>See all {sameCompany} roles at {job.company}</button>
      )}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="grabber" />
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
