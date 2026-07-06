import type { ReactNode } from 'react';

/** S3 — Dashboard widget grid + card shell (§3.5). Looser density than queues. */
export function WidgetGrid({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 14 }}>{children}</div>;
}

export function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warning' | 'danger' }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      <div className="figure" style={{ fontSize: 26, fontWeight: 500, color: tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--brass)' }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{hint}</div> : null}
    </div>
  );
}

export function StageBars({ data }: { data: { label: string; value: number; display: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 70px', gap: 12, alignItems: 'center', fontSize: 12.5 }}>
          <span style={{ color: 'var(--text-2)' }}>{d.label}</span>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: 'var(--accent)', opacity: 0.85 }} />
          </div>
          <span className="figure" style={{ fontSize: 12.5, textAlign: 'right' }}>{d.display}</span>
        </div>
      ))}
    </div>
  );
}
