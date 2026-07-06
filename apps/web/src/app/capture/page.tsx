'use client';
import { useState } from 'react';

/** Voice capture surface — PWA route. MediaRecorder wiring + offline outbox land in C-block 1; this is the S4-adjacent UI shell. */
export default function Capture() {
  const [recording, setRecording] = useState(false);
  return (
    <div style={{ maxWidth: 460, margin: '8vh auto 0', textAlign: 'center' }}>
      <h1 style={{ fontSize: 19, fontWeight: 600 }}>Dictate a note</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Finish a call, capture it before it evaporates. The system does the filing.</p>
      <button
        onClick={() => setRecording((r) => !r)}
        style={{
          width: 132, height: 132, borderRadius: '50%', margin: '28px auto', display: 'block', cursor: 'pointer',
          border: `2px solid ${recording ? 'var(--danger)' : 'var(--accent)'}`,
          background: recording ? 'var(--danger-tint)' : 'var(--accent-tint)',
          color: recording ? 'var(--danger)' : 'var(--accent)', fontSize: 15, fontWeight: 600,
        }}
      >
        {recording ? 'Stop' : 'Record'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
        {recording ? 'Recording… saved locally, uploads on reconnect.' : 'Works offline — recordings queue and upload when you are back on signal.'}
      </p>
    </div>
  );
}
