'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet, fmtMoney, type DashboardSummary, type PriorityAction, type PipelineDeal } from '../lib/api';
import { MarketIntelPanel } from '../components/market-intel';

const STAGE_TONE: Record<string, string> = {
  prospecting: 'var(--text-2)', negotiating: 'var(--accent)', loi: 'var(--brass)', due_diligence: 'var(--success)',
};
const STAGE_LABEL: Record<string, string> = {
  prospecting: 'Prospecting', negotiating: 'Negotiating', loi: 'LOI', due_diligence: 'Due diligence',
};

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warning' | 'danger' }) {
  return (
    <div className="card" style={{ padding: '16px 18px 14px' }}>
      <div className="eyebrow">{label}</div>
      <div className="figure" style={{ fontSize: 30, lineHeight: 1.15, marginTop: 7, color: tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--brass)' }}>
        {value}
      </div>
      {hint ? <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5, paddingTop: 7, borderTop: '1px solid var(--border)' }}>{hint}</div> : null}
    </div>
  );
}

function ChannelIcon({ kind }: { kind: 'Call' | 'Email' }) {
  return (
    <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', flexShrink: 0 }} aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'Call'
          ? <path d="M3 2h2.5l1 3-1.5 1a8.5 8.5 0 0 0 4 4l1-1.5 3 1V12a1.5 1.5 0 0 1-1.5 1.5C6 13.5 1.5 9 1.5 3.5A1.5 1.5 0 0 1 3 2z" />
          : <path d="M1.5 3.5h12v8h-12zM1.5 4l6 4.5L13.5 4" />}
      </svg>
    </span>
  );
}

export default function Dashboard() {
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: () => apiGet<DashboardSummary>('/dashboard/summary') });
  const actions = useQuery({ queryKey: ['priority-actions'], queryFn: () => apiGet<PriorityAction[]>('/dashboard/priority-actions') });
  const pipeline = useQuery({ queryKey: ['pipeline-table'], queryFn: () => apiGet<PipelineDeal[]>('/dashboard/pipeline') });

  const d = summary.data;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{today} · Rowan, Cabarrus &amp; Davidson Counties</div>
          <h1 className="display" style={{ fontSize: 30, margin: 0, lineHeight: 1.1 }}>Good morning, Jaben.</h1>
        </div>
        <Link href="/capture" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>+ New entry</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 13, marginBottom: 16 }}>
        <Metric label="Active deals" value={d ? String(d.dealTrackCount) : '—'} hint="deal-track opportunities" />
        <Metric label="Pipeline value" value={d ? fmtMoney(d.pipelineValue) : '—'} hint="across all stages" />
        <Metric label="Follow-ups due" value={d ? String(d.followUpsDue) : '—'} hint={d ? `${d.followUpsOverdue} overdue` : ' '} tone={d && d.followUpsOverdue > 0 ? 'warning' : undefined} />
        <Metric label="New leads (7d)" value={d ? String(d.newLeads) : '—'} hint="routed this week" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.08fr) minmax(0,1fr)', gap: 15, marginBottom: 15 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Today&apos;s priority actions</span>
            {actions.data?.some((a) => a.status === 'overdue') ? (
              <span className="chip" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
                {actions.data.filter((a) => a.status === 'overdue').length} overdue
              </span>
            ) : null}
          </div>
          {actions.isLoading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Loading…</div>
          ) : actions.data && actions.data.length ? (
            <div>
              {actions.data.map((a, i) => (
                <div key={a.id} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', margin: '0 -8px', borderRadius: 8, borderBottom: i < actions.data!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <ChannelIcon kind={a.action} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.action} {a.contact}{a.company ? <span style={{ color: 'var(--text-2)', fontWeight: 400 }}> · {a.company}</span> : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.opportunity ?? 'Relationship cadence'}
                      {a.status === 'overdue' ? <span style={{ color: 'var(--danger)', fontWeight: 500 }}> · overdue {a.daysOverdue}d</span> : ' · due'}
                    </div>
                  </div>
                  <button className="btn" style={{ fontSize: 12, flexShrink: 0 }}>{a.action}</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Nothing pressing — you&apos;re clear.</div>
          )}
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Active deal pipeline</span>
            <Link href="/pipeline" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500 }}>Full pipeline →</Link>
          </div>
          {pipeline.isLoading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Loading…</div>
          ) : pipeline.data && pipeline.data.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Property', 'Stage', 'Value', 'Age'].map((h) => (
                    <th key={h} className="eyebrow" style={{ textAlign: h === 'Value' || h === 'Age' ? 'right' : 'left', padding: '0 0 9px', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipeline.data.map((p) => (
                  <tr key={p.id} className="row-hover">
                    <td style={{ padding: '9px 0', borderTop: '1px solid var(--border)', maxWidth: 170 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address ?? p.title}</div>
                      {p.submarket || p.assetClass ? (
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{[p.submarket, p.assetClass].filter(Boolean).join(' · ')}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '9px 0', borderTop: '1px solid var(--border)', fontSize: 12.5 }}>
                      <span style={{ color: STAGE_TONE[p.stage] ?? 'var(--text-2)', fontWeight: 500 }}>● {STAGE_LABEL[p.stage] ?? p.stage}</span>
                    </td>
                    <td className="figure" style={{ padding: '9px 0', borderTop: '1px solid var(--border)', textAlign: 'right', fontSize: 13 }}>{p.value ? fmtMoney(p.value) : '—'}</td>
                    <td style={{ padding: '9px 0', borderTop: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-3)', fontSize: 12.5 }}>{p.ageDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>No active deal-track opportunities.</div>
          )}
        </div>
      </div>

      <MarketIntelPanel />
    </>
  );
}
