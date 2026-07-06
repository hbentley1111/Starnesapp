'use client';
import { useState } from 'react';

/**
 * S2 — Review-and-correct form (§3.5): field-level diff (LLM value vs current)
 * with per-field accept / edit / reject, confidence indicators, submit-as-patch.
 * The product contract made visible: fields under 0.75 arrive pre-flagged for
 * mandatory review and cannot be bulk-accepted.
 */
export interface ReviewField {
  key: string;
  label: string;
  current: string | null;
  proposed: string;
  confidence: number; // 0–1
}
type Decision = 'pending' | 'accepted' | 'rejected' | 'edited';

export function ConfidenceChip({ value }: { value: number }) {
  const low = value < 0.75;
  return (
    <span className="chip figure" style={{ background: low ? 'var(--warning-tint)' : 'var(--success-tint)', color: low ? 'var(--warning)' : 'var(--success)', fontSize: 11.5 }}>
      {(value * 100).toFixed(0)}%{low ? ' · review' : ''}
    </span>
  );
}

export interface ReviewDecision { key: string; decision: 'accepted' | 'edited' | 'rejected'; value: string }

export function ReviewCorrectForm({ fields, onSubmit, submitting }: { fields: ReviewField[]; onSubmit?: (decisions: ReviewDecision[]) => void; submitting?: boolean }) {
  const [state, setState] = useState<Record<string, { decision: Decision; value: string }>>(
    Object.fromEntries(fields.map((f) => [f.key, { decision: 'pending', value: f.proposed }])),
  );
  const decide = (key: string, decision: Decision, value?: string) =>
    setState((s) => ({ ...s, [key]: { decision, value: value ?? s[key].value } }));

  const unresolvedLow = fields.filter((f) => f.confidence < 0.75 && state[f.key].decision === 'pending');
  const resolved = fields.filter((f) => state[f.key].decision !== 'pending' && state[f.key].decision !== 'rejected');

  return (
    <div className="card">
      {fields.map((f, i) => {
        const st = state[f.key];
        return (
          <div key={f.key} style={{ padding: '13px 16px', borderBottom: i < fields.length - 1 ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: '150px minmax(0,1fr) auto', gap: 14, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{f.label}</div>
              <div style={{ marginTop: 4 }}><ConfidenceChip value={f.confidence} /></div>
            </div>
            <div style={{ fontSize: 13 }}>
              {f.current ? (
                <div style={{ color: 'var(--text-3)', textDecoration: st.decision === 'accepted' || st.decision === 'edited' ? 'line-through' : 'none' }}>{f.current}</div>
              ) : (
                <div style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>empty</div>
              )}
              {st.decision === 'edited' ? (
                <input type="text" value={st.value} onChange={(e) => decide(f.key, 'edited', e.target.value)} style={{ marginTop: 4, width: '100%' }} />
              ) : (
                <div style={{ color: st.decision === 'rejected' ? 'var(--text-3)' : 'var(--text-1)', textDecoration: st.decision === 'rejected' ? 'line-through' : 'none', marginTop: 2 }}>
                  {st.value}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-accent" style={{ opacity: st.decision === 'accepted' ? 1 : 0.85 }} onClick={() => decide(f.key, 'accepted')}>
                {st.decision === 'accepted' ? 'Accepted' : 'Accept'}
              </button>
              <button className="btn" onClick={() => decide(f.key, 'edited')}>Edit</button>
              <button className="btn btn-danger" onClick={() => decide(f.key, 'rejected')}>Reject</button>
            </div>
          </div>
        );
      })}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-accent"
          disabled={unresolvedLow.length > 0}
          style={{ opacity: unresolvedLow.length ? 0.45 : 1, cursor: unresolvedLow.length ? 'not-allowed' : 'pointer' }}
          onClick={() => {
            const decided = fields.filter((f) => state[f.key].decision !== 'pending');
            onSubmit?.(decided.map((f) => ({ key: f.key, decision: state[f.key].decision as 'accepted' | 'edited' | 'rejected', value: state[f.key].value })));
          }}
        >
          {submitting ? 'Committing…' : `Commit ${resolved.length} field${resolved.length === 1 ? '' : 's'}`}
        </button>
        {unresolvedLow.length > 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--warning)' }}>
            {unresolvedLow.length} low-confidence field{unresolvedLow.length === 1 ? '' : 's'} must be resolved before commit
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Nothing commits without your review</span>
        )}
      </div>
    </div>
  );
}
