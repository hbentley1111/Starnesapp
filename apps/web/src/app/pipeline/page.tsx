'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiGet, fmtMoney, type OpportunityRow } from '../../lib/api';

/**
 * Deal Pipeline — the broker's working view: deal-track opportunities laid out
 * as a board, one column per stage. Non-deal-track types (owner intel, investor
 * placements, referrals) carry the lighter open/active/closed status and live
 * on the Opportunities list instead, so this board stays focused on live deals.
 */
const STAGES: { key: string; label: string; accent: string }[] = [
  { key: 'prospecting', label: 'Prospecting', accent: 'var(--text-2)' },
  { key: 'negotiating', label: 'Negotiating', accent: 'var(--accent)' },
  { key: 'loi', label: 'LOI', accent: 'var(--brass)' },
  { key: 'due_diligence', label: 'Due Diligence', accent: 'var(--success)' },
];

export default function Pipeline() {
  const { data, isLoading } = useQuery({ queryKey: ['opportunities'], queryFn: () => apiGet<OpportunityRow[]>('/opportunities') });

  const deals = (data ?? []).filter((o) => o.stage); // deal-track only
  const byStage = (stage: string) => deals.filter((d) => d.stage === stage);
  const stageValue = (stage: string) =>
    byStage(stage).reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);
  const totalValue = deals.reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>Deal Pipeline</h1>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
          {deals.length} active deals · <span className="figure" style={{ fontSize: 13 }}>{fmtMoney(totalValue)}</span> total
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 18px' }}>
        Your live deal-track opportunities, by stage. Owner intel, investor placements, and referrals live under{' '}
        <Link href="/opportunities" style={{ color: 'var(--accent)' }}>Opportunities</Link>.
      </p>

      {isLoading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading pipeline…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(0,1fr))`, gap: 12, alignItems: 'start' }}>
          {STAGES.map((stage) => {
            const cards = byStage(stage.key);
            return (
              <div key={stage.key} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, minHeight: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px', borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: stage.accent }}>● {stage.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{cards.length}</span>
                </div>

                {cards.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center', padding: '14px 0' }}>—</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cards.map((d) => (
                      <div key={d.id} className="card" style={{ padding: '10px 12px', boxShadow: 'none' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, marginBottom: 6 }}>{d.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 10.5 }}>{d.opportunity_type}</span>
                          <span className="figure" style={{ fontSize: 12.5 }}>{d.value ? fmtMoney(Number(d.value)) : '—'}</span>
                        </div>
                        {d.contact ? (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{d.contact}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {cards.length > 0 ? (
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', textAlign: 'right', paddingTop: 10, marginTop: 4, borderTop: '1px solid var(--border)' }}>
                    <span className="figure" style={{ fontSize: 11 }}>{fmtMoney(stageValue(stage.key))}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
