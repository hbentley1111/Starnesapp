'use client';

/**
 * Market Intelligence — PHASE 2 preview.
 *
 * This is intentionally NOT live data. Per the proposal, market intelligence /
 * property research is Phase 2 ("the offense"), and external listing data
 * (CoStar/MLS/CREXi/LoopNet) can't be ingested under license terms. A real
 * feed would draw on PUBLIC sources (NC OneMap / county GIS). The panel is
 * shown so the demo conveys the vision — labeled honestly, with representative
 * figures — rather than implying a live market feed the MVP doesn't have.
 */
const SNAPSHOT = {
  submarket: 'I-85 Corridor · Rowan County',
  headline: 'Industrial vacancy tightened to 8.2%',
  body: 'Representative snapshot: available industrial inventory down from 12.4% to 8.2% QoQ, driven by new distribution leases in the 80–120k SF range. Asking rents ~$6.40/SF NNN.',
};

export function MarketIntelPanel() {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Market Intelligence</span>
        <span className="chip" style={{ background: 'var(--brass-tint)', color: 'var(--brass)' }}>Phase 2 preview</span>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          {SNAPSHOT.submarket}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{SNAPSHOT.headline}</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{SNAPSHOT.body}</p>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
        Representative data. A live feed would pull public GIS / county records for your served markets —
        scoped for Phase 2. No licensed listing data (CoStar/MLS) is ingested.
      </p>
    </div>
  );
}
