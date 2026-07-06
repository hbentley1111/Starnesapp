'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, type CaptureResult } from '../../lib/api';

/**
 * Capture surface. The demo-reliable path: paste or type a note, run it through
 * the real extraction pipeline, land the results at the review gate.
 * (MediaRecorder + speech-to-text is the full-fidelity upgrade — heavier, needs
 * a transcription provider — and slots into this same submit path later.)
 */
const SAMPLES = [
  {
    label: 'Messy call (Fireflies-style)',
    hint: 'crosstalk + a mis-heard address → catches at the review gate',
    text: 'SPEAKER 1: the one at 217 South Tryon, the office tower. Marcus, you and the family have held that twenty years? SPEAKER 2: Longer. Bell Family Holdings is not going to keep it forever. Twelve, eighteen months we start looking at selling. SPEAKER 3: was that eighteen or eighty? bad line. SPEAKER 1: I will circle back with you in September.',
  },
  {
    label: 'Clean dictation',
    hint: 'every field high-confidence',
    text: 'Quick note. I spoke with Dana Whitfield at Apex Logistics, dana@apexlogistics.com, 704-555-0142. She needs forty thousand square feet of warehouse, a lease, within six months. The building at 4120 Old Charlotte Highway could work. Send her three options by Friday and get a site tour scheduled.',
  },
];

export default function Capture() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const router = useRouter();
  const qc = useQueryClient();

  const capture = useMutation({
    mutationFn: (transcript: string) => apiPost<CaptureResult>('/voice/manual', { transcript }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['extractions'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div style={{ maxWidth: 660, margin: '2vh auto 0' }}>
      <h1 style={{ fontSize: 19, fontWeight: 600 }}>Capture a note</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
        Dictate or paste a note from a call. The extraction pipeline pulls out structured fields, scores its own
        confidence, and routes anything uncertain to review — nothing is committed without you.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {SAMPLES.map((s) => (
          <button key={s.label} className="btn" title={s.hint} onClick={() => { setText(s.text); setResult(null); }}>
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(null); }}
        placeholder="Paste a call transcript, dictate into it, or tap a sample above…"
        style={{ width: '100%', minHeight: 160, resize: 'vertical', lineHeight: 1.6 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <button
          className="btn btn-accent"
          disabled={text.trim().length < 10 || capture.isPending}
          style={{ opacity: text.trim().length < 10 || capture.isPending ? 0.5 : 1, padding: '7px 18px' }}
          onClick={() => capture.mutate(text.trim())}
        >
          {capture.isPending ? 'Extracting…' : 'Run extraction'}
        </button>
        {capture.isError ? <span style={{ fontSize: 12.5, color: 'var(--danger)' }}>Something went wrong — is the API running?</span> : null}
        {result ? (
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Extracted <span className="figure" style={{ color: 'var(--brass)' }}>{result.fields}</span> fields
            {result.needsReview > 0 ? (
              <> · <span className="figure" style={{ color: 'var(--warning)' }}>{result.needsReview}</span> need review</>
            ) : (
              <> · all high-confidence</>
            )}
            {result.deduped ? <span style={{ color: 'var(--text-3)' }}> · (re-run of an existing note)</span> : null}
          </span>
        ) : null}
      </div>

      {result ? (
        <div className="card" style={{ marginTop: 18, padding: '16px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>Ready for review</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 12px' }}>
            {result.needsReview > 0
              ? `${result.needsReview} field${result.needsReview === 1 ? '' : 's'} came back low-confidence — likely a garbled name or address. Open the review gate to accept, edit, or reject before anything is committed.`
              : 'Every field cleared the confidence bar. Review and commit whenever you like.'}
          </p>
          <button className="btn btn-accent" onClick={() => router.push('/approvals')}>Open review gate →</button>
        </div>
      ) : null}
    </div>
  );
}
