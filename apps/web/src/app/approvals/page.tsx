'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueueShell, StatusChip } from '../../engines/s1-queue-shell';
import { ReviewCorrectForm, type ReviewDecision, type ReviewField } from '../../engines/s2-review-form';
import { apiGet, apiPost, type DraftRow, type PendingExtraction } from '../../lib/api';

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Contact', name: 'Company', address: 'Property', intent: 'Intent',
  opportunity_type: 'Opportunity type', description: 'Next action',
};

export default function Approvals() {
  const qc = useQueryClient();
  const drafts = useQuery({ queryKey: ['approvals'], queryFn: () => apiGet<DraftRow[]>('/approvals') });
  const extractions = useQuery({ queryKey: ['extractions'], queryFn: () => apiGet<PendingExtraction[]>('/extractions/pending') });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => apiPost(`/approvals/${id}/${action}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['approvals'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const review = useMutation({
    mutationFn: ({ interactionId, decisions }: { interactionId: string; decisions: { entityId: string; action: 'accept' | 'edit' | 'reject'; value?: string }[] }) =>
      apiPost(`/extractions/${interactionId}/review`, { decisions }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['extractions'] }),
  });

  const first = extractions.data?.[0];
  const reviewFields: ReviewField[] = (first?.fields ?? []).map((f) => ({
    key: f.entityId,
    label: FIELD_LABELS[f.fieldKey] ?? f.fieldKey,
    current: null,
    proposed: typeof f.value === 'string' ? f.value : JSON.stringify(f.value),
    confidence: Number(f.confidence),
  }));

  return (
    <>
      <h1 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 16px' }}>Approvals</h1>
      <QueueShell<DraftRow>
        columns={[
          { key: 'channel', label: 'Channel', width: '110px', render: (r) => <StatusChip tone="muted">{r.channel}</StatusChip> },
          { key: 'contact', label: 'Contact', width: '160px' },
          { key: 'generated_body', label: 'Draft', render: (r) => <span style={{ display: 'inline-block', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{r.edited_body ?? r.generated_body}</span> },
        ]}
        rows={drafts.data ?? []}
        loading={drafts.isLoading}
        empty="No drafts waiting — the agents have nothing pending"
        actions={[
          { label: 'Approve', tone: 'accent', onClick: (r) => decide.mutate({ id: r.id, action: 'approve' }) },
          { label: 'Reject', tone: 'danger', onClick: (r) => decide.mutate({ id: r.id, action: 'reject' }) },
        ]}
        dense
      />

      {first ? (
        <>
          <div style={{ margin: '26px 0 10px', fontSize: 13.5, fontWeight: 600 }}>
            Review extraction · {first.contact ?? 'unknown contact'}
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400, marginLeft: 10 }}>
              {first.source} · {new Date(first.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <ReviewCorrectForm
            fields={reviewFields}
            submitting={review.isPending}
            onSubmit={(decisions: ReviewDecision[]) =>
              review.mutate({
                interactionId: first.interaction_id,
                decisions: decisions.map((d) => ({
                  entityId: d.key,
                  action: d.decision === 'accepted' ? 'accept' : d.decision === 'edited' ? 'edit' : 'reject',
                  ...(d.decision === 'edited' ? { value: d.value } : {}),
                })),
              })
            }
          />
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 10 }}>
            Accepted corrections write a new version — the original stays in the record&apos;s history.
          </p>
        </>
      ) : extractions.isLoading ? null : (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 22 }}>No extractions waiting for review.</p>
      )}
    </>
  );
}
