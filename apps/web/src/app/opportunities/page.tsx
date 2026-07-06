'use client';
import { useQuery } from '@tanstack/react-query';
import { QueueShell, StatusChip } from '../../engines/s1-queue-shell';
import { apiGet, fmtMoney, type OpportunityRow } from '../../lib/api';

export default function Opportunities() {
  const { data, isLoading } = useQuery({ queryKey: ['opportunities'], queryFn: () => apiGet<OpportunityRow[]>('/opportunities') });
  return (
    <>
      <h1 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 6px' }}>Opportunities</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 16px' }}>
        Deal-track types move through the four-stage pipeline; everything else carries a lighter open/active/closed status.
      </p>
      <QueueShell<OpportunityRow>
        columns={[
          { key: 'title', label: 'Opportunity', render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
          { key: 'opportunity_type', label: 'Type', width: '170px', render: (r) => <StatusChip tone="muted">{r.opportunity_type}</StatusChip> },
          { key: 'stage', label: 'Stage / status', width: '140px', render: (r) => (r.stage ? <StatusChip tone="accent">{r.stage}</StatusChip> : <StatusChip tone="muted">{r.status}</StatusChip>) },
          { key: 'value', label: 'Value', width: '90px', render: (r) => <span className="figure" style={{ fontSize: 13 }}>{r.value ? fmtMoney(Number(r.value)) : '—'}</span> },
          { key: 'contact', label: 'Contact', width: '150px', render: (r) => r.contact ?? '—' },
        ]}
        rows={data ?? []}
        loading={isLoading}
        filterKeys={['title', 'contact', 'opportunity_type']}
      />
    </>
  );
}
