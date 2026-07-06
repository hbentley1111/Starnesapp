'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MetricCard, StageBars, WidgetGrid } from '../engines/s3-widgets';
import { ApprovalPreview } from '../components/approval-preview';
import { apiGet, fmtMoney, type DashboardSummary } from '../lib/api';

const STAGE_LABELS: Record<string, string> = { prospecting: 'Prospecting', negotiating: 'Negotiating', loi: 'LOI', due_diligence: 'Due diligence' };
const STAGE_ORDER = ['prospecting', 'negotiating', 'loi', 'due_diligence'];

export default function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => apiGet<DashboardSummary>('/dashboard/summary') });

  const stages = STAGE_ORDER.map((s) => {
    const found = data?.pipelineByStage.find((x) => x.stage === s);
    return { label: STAGE_LABELS[s], value: found?.total ?? 0, display: found ? fmtMoney(found.total) : '—' };
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>Today</h1>
        <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>

      <WidgetGrid cols={3}>
        <MetricCard label="Pipeline value" value={data ? fmtMoney(data.pipelineValue) : '…'} hint={data ? `${data.dealTrackCount} deal-track opportunities` : ''} />
        <MetricCard label="Follow-ups due" value={data ? String(data.followUpsDue) : '…'} hint={data ? `${data.followUpsOverdue} overdue` : ''} tone={data && data.followUpsOverdue > 0 ? 'warning' : undefined} />
        <MetricCard label="New leads" value={data ? String(data.newLeads) : '…'} hint="last 7 days" />
      </WidgetGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 14, marginTop: 14 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Pipeline by stage</span>
            <Link href="/opportunities" style={{ fontSize: 12.5, color: 'var(--accent)' }}>All opportunities</Link>
          </div>
          <StageBars data={stages} />
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>Waiting for your approval</div>
          <ApprovalPreview />
        </div>
      </div>
    </>
  );
}
