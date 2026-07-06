/** Thin fetch client — TanStack Query is the server-state layer (§3.2). */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? '{}' : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface ContactRow {
  id: string; full_name: string; company: string | null;
  last_contacted_at: string | null; tier: number | null; next_due_at: string | null;
  status: 'current' | 'overdue';
}
export interface OpportunityRow {
  id: string; title: string; opportunity_type: string;
  stage: string | null; status: string | null; value: string | null; contact: string | null;
}
export interface DraftRow {
  id: string; channel: string; generated_body: string; edited_body: string | null;
  approval_state: string; contact: string;
}
export interface PendingExtraction {
  interaction_id: string; occurred_at: string; source: string; contact: string | null;
  fields: { entityId: string; fieldKey: string; targetType: string; value: unknown; confidence: string | number; status: string }[];
}
export interface DashboardSummary {
  pipelineValue: number; dealTrackCount: number; followUpsDue: number; followUpsOverdue: number;
  newLeads: number; pipelineByStage: { stage: string; total: number }[];
}

export const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  : n >= 1_000 ? `$${Math.round(n / 1_000)}k`
  : `$${n}`;

export const ago = (iso: string | null) => {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'today' : `${days}d ago`;
};
