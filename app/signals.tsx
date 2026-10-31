'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon, timeAgo } from './components';
import type { Signal, SignalKind } from '@/lib/signals';


const KINDS: Array<{ key: 'all' | SignalKind; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'post', label: 'Hiring posts' }, { key: 'contest', label: 'Contests' },
  { key: 'funding', label: 'Just funded' }, { key: 'yc', label: 'YC hiring' },
];
const LABEL: Record<SignalKind, string> = { post: 'Hiring post', contest: 'Contest', funding: 'Funded', yc: 'YC' };

export default function Signals({ onCold }: { onCold: (company: string, url: string, id: string) => void }) {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [kind, setKind] = useState<'all' | SignalKind>('all');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Show what's stored straight away, then top up in the background (the server throttles this).
    fetch('/api/signals').then(r => r.json()).then(d => setSignals(d.signals || [])).catch(() => setSignals([]));
    fetch('/api/signals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refresh' }) })
      .then(r => r.json()).then(d => { if (d.added) setSignals(d.signals); }).catch(() => {});
  }, []);

  const shown = useMemo(() => (signals || []).filter(s => kind === 'all' || s.kind === kind), [signals, kind]);
  const count = (k: string) => (signals || []).filter(s => k === 'all' || s.kind === k).length;

  const dismiss = (id: string) => {
    setSignals(l => (l || []).filter(s => s.id !== id));
    fetch('/api/signals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', id }) }).catch(() => {});
  };
  const refresh = async () => {
    setBusy(true);
    const d = await fetch('/api/signals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refresh' }) }).then(r => r.json()).catch(() => null);
    if (d?.signals) setSignals(d.signals);
    setBusy(false);
  };

  return (
    <section className="sig">
      <div className="seg" role="tablist">
        {KINDS.map(k => (
          <button key={k.key} role="tab" aria-selected={kind === k.key} className={kind === k.key ? 'on' : ''} onClick={() => setKind(k.key)}>
            {k.label} <span className="cnt">{count(k.key)}</span>
          </button>
        ))}
      </div>

      {signals === null ? <div className="card skeleton"><i /><i /><i /></div>
        : shown.length === 0 ? (
          <div className="empty">
            <Icon name="zap" size={34} />
            <p>{kind === 'post' ? 'No hiring posts yet' : 'Nothing here yet'}</p>
            <span>{kind === 'post' ? 'Hiring posts need SERPER_API_KEY. They’re searched twice a day.' : 'Sources refresh every few hours.'}</span>
            <button className="btn" onClick={refresh} disabled={busy}>{busy ? 'Checking…' : 'Check now'}</button>
          </div>
        ) : (
          <div className="sig-list">
            {shown.map(s => (
              <article key={s.id} className="sig-card">
                <div className="sig-head"><span className={`sig-kind ${s.kind}`}>{LABEL[s.kind]}</span>{s.org && s.org !== s.title && <span>{s.org}</span>}<span>{timeAgo(s.first_seen)}</span></div>
                <b>{s.title}</b>
                {s.detail && <p>{s.detail}</p>}
                <div className="sig-actions">
                  <a className="btn sm" href={s.url} target="_blank" rel="noopener noreferrer">Open <Icon name="external" size={13} /></a>
                  {(s.kind === 'funding' || s.kind === 'yc') && <button className="btn sm" onClick={() => onCold(s.org, s.url, `signal:${s.id}`)}><Icon name="sparkle" size={14} /> Reach out</button>}
                  <button className="icon-btn sm x" onClick={() => dismiss(s.id)} aria-label="Dismiss"><Icon name="x" size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
    </section>
  );
}
