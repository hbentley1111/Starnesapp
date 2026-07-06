'use client';
import { useMemo, useState, type ReactNode } from 'react';

/**
 * S1 — Review/Queue shell (§3.5). The workhorse engine: powers the transcript
 * queue, HITL approvals, agent errors, follow-ups, digest, contacts,
 * opportunities, leads. Config-driven columns/actions; status chips;
 * filter/sort; skeleton rows reserve dimensions (CLS < 0.1 is a correctness
 * requirement in the approval queue, not polish).
 */
export interface QueueColumn<Row> {
  key: string;
  label: string;
  width?: string;
  render?: (row: Row) => ReactNode;
}
export interface QueueAction<Row> {
  label: string;
  tone?: 'default' | 'accent' | 'danger';
  onClick: (row: Row) => void;
}
export interface QueueShellProps<Row extends { id: string }> {
  columns: QueueColumn<Row>[];
  rows: Row[];
  actions?: QueueAction<Row>[];
  filterKeys?: (keyof Row)[];
  loading?: boolean;
  empty?: string;
  dense?: boolean;
}

export function StatusChip({ tone, children }: { tone: 'accent' | 'warning' | 'danger' | 'success' | 'muted'; children: ReactNode }) {
  const map = {
    accent: ['var(--accent-tint)', 'var(--accent)'],
    warning: ['var(--warning-tint)', 'var(--warning)'],
    danger: ['var(--danger-tint)', 'var(--danger)'],
    success: ['var(--success-tint)', 'var(--success)'],
    muted: ['var(--surface-2)', 'var(--text-2)'],
  } as const;
  const [bg, fg] = map[tone];
  return <span className="chip" style={{ background: bg, color: fg }}>{children}</span>;
}

export function QueueShell<Row extends { id: string }>({ columns, rows, actions, filterKeys, loading, empty = 'Nothing here', dense }: QueueShellProps<Row>) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q || !filterKeys?.length) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => filterKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(needle)));
  }, [rows, q, filterKeys]);

  const pad = dense ? '8px 12px' : '11px 14px';

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {filterKeys?.length ? (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <input type="search" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
        </div>
      ) : null}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: pad, color: 'var(--text-3)', fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', width: c.width }}>
                {c.label}
              </th>
            ))}
            {actions?.length ? <th style={{ borderBottom: '1px solid var(--border)', width: 1 }} /> : null}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + (actions?.length ? 1 : 0)} style={{ padding: pad, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ height: 16, borderRadius: 4, background: 'var(--surface-2)' }} />
                  </td>
                </tr>
              ))
            : filtered.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: pad, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                  {actions?.length ? (
                    <td style={{ padding: pad, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        {actions.map((a) => (
                          <button key={a.label} className={`btn ${a.tone === 'accent' ? 'btn-accent' : a.tone === 'danger' ? 'btn-danger' : ''}`} onClick={() => a.onClick(row)}>
                            {a.label}
                          </button>
                        ))}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
          {!loading && filtered.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions?.length ? 1 : 0)} style={{ padding: '28px 14px', color: 'var(--text-3)', textAlign: 'center' }}>{empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
