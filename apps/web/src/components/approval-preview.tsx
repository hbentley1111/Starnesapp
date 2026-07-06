'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { StatusChip } from '../engines/s1-queue-shell';
import { apiGet, type DraftRow, type PendingExtraction } from '../lib/api';

export function ApprovalPreview() {
  const drafts = useQuery({ queryKey: ['approvals'], queryFn: () => apiGet<DraftRow[]>('/approvals') });
  const extractions = useQuery({ queryKey: ['extractions'], queryFn: () => apiGet<PendingExtraction[]>('/extractions/pending') });

  const rows = [
    ...(drafts.data ?? []).map((d) => ({ id: d.id, summary: `${d.channel === 'calendar' ? 'Calendar' : 'Outreach'} · ${d.contact}`, detail: d.generated_body, tone: 'accent' as const, label: 'pending' })),
    ...(extractions.data ?? []).map((e) => {
      const low = e.fields.filter((f) => Number(f.confidence) < 0.75).length;
      return { id: e.interaction_id, summary: `Extraction · ${e.contact ?? 'unknown contact'}`, detail: `${e.fields.length} fields${low ? ` · ${low} need review` : ''}`, tone: low ? ('warning' as const) : ('accent' as const), label: low ? 'needs review' : 'pending' };
    }),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.length === 0 ? <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Queue is clear</span> : null}
      {rows.map((item, i) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</div>
          </div>
          <span style={{ marginLeft: 'auto' }}><StatusChip tone={item.tone}>{item.label}</StatusChip></span>
        </div>
      ))}
      <Link href="/approvals" style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 10 }}>Open approval queue</Link>
    </div>
  );
}
