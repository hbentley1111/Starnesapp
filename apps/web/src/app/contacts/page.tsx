'use client';
import { useQuery } from '@tanstack/react-query';
import { QueueShell, StatusChip } from '../../engines/s1-queue-shell';
import { ago, apiGet, type ContactRow } from '../../lib/api';

export default function Contacts() {
  const { data, isLoading } = useQuery({ queryKey: ['contacts'], queryFn: () => apiGet<ContactRow[]>('/contacts') });
  return (
    <>
      <h1 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 16px' }}>Contacts</h1>
      <QueueShell<ContactRow>
        columns={[
          { key: 'full_name', label: 'Name', render: (r) => <span style={{ fontWeight: 500 }}>{r.full_name}</span> },
          { key: 'company', label: 'Company', render: (r) => r.company ?? '—' },
          { key: 'tier', label: 'Cadence', width: '110px', render: (r) => (r.tier ? <span className="figure" style={{ fontSize: 12.5 }}>{r.tier}-day</span> : '—') },
          { key: 'last_contacted_at', label: 'Last touch', width: '110px', render: (r) => ago(r.last_contacted_at) },
          { key: 'status', label: 'Status', width: '110px', render: (r) => (r.status === 'overdue' ? <StatusChip tone="danger">overdue</StatusChip> : <StatusChip tone="success">current</StatusChip>) },
        ]}
        rows={data ?? []}
        loading={isLoading}
        filterKeys={['full_name', 'company']}
        empty="No contacts yet — run the Sheets import"
      />
    </>
  );
}
