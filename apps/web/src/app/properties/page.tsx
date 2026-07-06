'use client';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, fmtMoney, type PropertyResult, type PropertySearchResponse } from '../../lib/api';

function SourceChip({ source }: { source: 'rentcast' | 'sample' }) {
  return source === 'rentcast' ? (
    <span className="chip" style={{ background: 'var(--success-tint)', color: 'var(--success)' }}>Live · RentCast</span>
  ) : (
    <span className="chip" style={{ background: 'var(--brass-tint)', color: 'var(--brass)' }}>Sample data — add RENTCAST_API_KEY to go live</span>
  );
}

function saleAgo(iso: string | null): string {
  if (!iso) return '';
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

function PropertyCard({ p }: { p: PropertyResult }) {
  return (
    <div className="card card-hover" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{p.address}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>
        {[p.county ? `${p.county} County` : null, p.propertyType, p.squareFootage ? `${p.squareFootage.toLocaleString()} sqft` : null].filter(Boolean).join(' · ')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          {p.lastSaleDate ? `Sold ${saleAgo(p.lastSaleDate)}` : 'No recorded sale'}
          {p.ownerName ? ` · ${p.ownerName}` : ''}
        </span>
        <span className="figure" style={{ fontSize: 15 }}>{p.lastSalePrice ? fmtMoney(p.lastSalePrice) : '—'}</span>
      </div>
    </div>
  );
}

export default function PropertySearch() {
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState<PropertySearchResponse | null>(null);

  const recent = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => apiGet<PropertySearchResponse>('/market/recent-sales?days=7&limit=3'),
  });

  const search = useMutation({
    mutationFn: (query: string) => apiGet<PropertySearchResponse>(`/market/property-search?q=${encodeURIComponent(query)}`),
    onSuccess: setSearched,
  });

  const submit = () => { if (q.trim().length >= 3) search.mutate(q.trim()); };

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Rowan, Cabarrus &amp; Davidson Counties</div>
      <h1 className="display" style={{ fontSize: 26, margin: '0 0 6px', lineHeight: 1.1 }}>Property search</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 18px', maxWidth: 560 }}>
        Look up any property by address — ownership, size, and sale history. Results feed straight into your contacts and opportunities.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 8, maxWidth: 640 }}>
        <input
          type="search"
          placeholder="Search an address — e.g. 1240 Klumac Rd, Salisbury"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          style={{ flex: 1, padding: '10px 14px', fontSize: 13.5 }}
        />
        <button className="btn btn-primary" style={{ padding: '9px 20px' }} disabled={q.trim().length < 3 || search.isPending} onClick={submit}>
          {search.isPending ? 'Searching…' : 'Search'}
        </button>
      </div>

      {search.isError ? <p style={{ fontSize: 12.5, color: 'var(--danger)' }}>Search failed — try a fuller address.</p> : null}

      {searched ? (
        <div style={{ margin: '16px 0 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{searched.results.length} result{searched.results.length === 1 ? '' : 's'}</span>
            <SourceChip source={searched.source} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {searched.results.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: searched ? 0 : 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Top commercial sales · past 7 days</span>
          {recent.data ? <SourceChip source={recent.data.source} /> : null}
        </div>
        {recent.isLoading ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading recent sales…</div>
        ) : recent.data && recent.data.results.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {recent.data.results.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No commercial sales recorded in the past week.</div>
        )}
      </div>
    </>
  );
}
