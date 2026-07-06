'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet, fmtMoney, type DashboardSummary, type PriorityAction, type PipelineDeal } from '../lib/api';
import { MarketIntelPanel } from '../components/market-intel';

const STAGE_TONE: Record<string, string> = {
  prospecting: 'var(--text-2)', negotiating: 'var(--accent)', loi: 'var(--brass)', due_diligence: 'var(--success)',
};
const STAGE_LABEL: Record<string, string> = {
  prospecting: 'Prospecting', negotiating: 'Negotiating', loi: 'LOI', due_diligence: 'Due Diligence',
};

function Metric({ label, value, trend, tone }: { label: string; value: string; trend?: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="card" style={{ padding: '15px 17px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div className="figure" style={{ fontSize: 28, fontWeight: 500, marginTop: 4, color: tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--brass)' }}>
        {value}
      </div>
      {trend ? <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{trend}</div> : null}
    </div>
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
      {/* Greeting header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="display" style={{ fontSize: 26, margin: 0 }}>Good morning, Jaben.</h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{today} · Rowan, Cabarrus &amp; Davidson Counties</div>
        </div>
        <Link href="/capture" className="btn btn-accent" style={{ padding: '8px 16px' }}>+ New Entry</Link>
      </div>

      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        <Metric label="Active Deals" value={d ? String(d.dealTrackCount) : '…'} trend={d ? 'deal-track opportunities' : ''} />
        <Metric label="Pipeline Value" value={d ? fmtMoney(d.pipelineValue) : '…'} trend={d ? 'across the pipeline' : ''} />
        <Metric label="Follow-ups Due" value={d ? String(d.followUpsDue) : '…'} trend={d ? `${d.followUpsOverdue} overdue` : ''} tone={d && d.followUpsOverdue > 0 ? 'warning' : undefined} />
        <Metric label="New Leads (7d)" value={d ? String(d.newLeads) : '…'} trend="routed this week" />
      </div>

      {/* Two-column: priority actions + deal pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginBottom: 14 }}>
        {/* Priority actions */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Today&apos;s Priority Actions</span>
            {actions.data?.some((a) => a.status === 'overdue') ? (
              <span className="chip" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
                {actions.data.filter((a) => a.status === 'overdue').length} overdue
              </span>
            ) : null}
          </div>
          {actions.isLoading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
          ) : actions.data && actions.data.length ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {actions.data.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < actions.data!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: a.status === 'overdue' ? 'var(--danger)' : 'var(--warning)' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.action} {a.contact}{a.company ? ` · ${a.company}` : ''}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.opportunity ?? 'Relationship cadence'}{a.status === 'overdue' ? ` · overdue ${a.daysOverdue}d` : ' · due'}
                    </div>
                  </div>
                  <button className="btn" style={{ fontSize: 12, flexShrink: 0 }}>{a.action}</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Nothing pressing — you&apos;re clear.</div>
          )}
        </div>

        {/* Deal pipeline table */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Active Deal Pipeline</span>
            <Link href="/opportunities" style={{ fontSize: 12.5, color: 'var(--accent)' }}>Full pipeline →</Link>
          </div>
          {pipeline.isLoading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
          ) : pipeline.data && pipeline.data.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Property', 'Stage', 'Value', 'Age'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Value' || h === 'Age' ? 'right' : 'left', padding: '0 0 8px', color: 'var(--text-3)', fontWeight: 500, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipeline.data.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: '8px 0', borderTop: '1px solid var(--border)', maxWidth: 160 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address ?? p.title}</div>
                      {p.submarket || p.assetClass ? (
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{[p.submarket, p.assetClass].filter(Boolean).join(' · ')}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ color: STAGE_TONE[p.stage] ?? 'var(--text-2)' }}>● {STAGE_LABEL[p.stage] ?? p.stage}</span>
                    </td>
                    <td className="figure" style={{ padding: '8px 0', borderTop: '1px solid var(--border)', textAlign: 'right', fontSize: 12.5 }}>{p.value ? fmtMoney(p.value) : '—'}</td>
                    <td style={{ padding: '8px 0', borderTop: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-3)' }}>{p.ageDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No active deal-track opportunities.</div>
          )}
        </div>
      </div>

      {/* Market intelligence (Phase 2 preview) */}
      <MarketIntelPanel />
    </>
  );
}
