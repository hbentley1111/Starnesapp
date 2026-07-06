import { Injectable, Logger } from '@nestjs/common';

export interface PropertyResult {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  propertyType: string | null;
  squareFootage: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  ownerName: string | null;
}
export interface SearchResponse { source: 'rentcast' | 'sample'; results: PropertyResult[] }

export interface PropertySearchProvider {
  searchByAddress(query: string): Promise<SearchResponse>;
  recentCommercialSales(days: number, limit: number): Promise<SearchResponse>;
}

/**
 * Live RentCast provider. Key is server-side only (X-Api-Key header) — never
 * client-exposed. RentCast's license permits internal business use and
 * distribution to end-users (unlike MLS/CoStar, which stay manual per the
 * architecture). /properties supports saleDateRange (days) for sold-recently
 * queries; propertyType filtering narrows to commercial parcels.
 */
@Injectable()
export class RentCastProvider implements PropertySearchProvider {
  private readonly logger = new Logger(RentCastProvider.name);
  private readonly base = 'https://api.rentcast.io/v1';
  private readonly city = process.env.RENTCAST_MARKET_CITY ?? 'Salisbury';
  private readonly state = process.env.RENTCAST_MARKET_STATE ?? 'NC';

  private async call(path: string, params: Record<string, string>): Promise<unknown[]> {
    const key = process.env.RENTCAST_API_KEY;
    if (!key) throw new Error('RENTCAST_API_KEY not set');
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${this.base}${path}?${qs}`, { headers: { 'X-Api-Key': key, accept: 'application/json' } });
    if (!res.ok) throw new Error(`RentCast ${res.status}: ${await res.text()}`);
    const body = await res.json();
    return Array.isArray(body) ? body : [body];
  }

  private map(r: Record<string, any>): PropertyResult {
    return {
      id: String(r.id ?? r.formattedAddress ?? Math.random()),
      address: r.formattedAddress ?? [r.addressLine1, r.city, r.state].filter(Boolean).join(', '),
      city: r.city ?? null,
      state: r.state ?? null,
      zip: r.zipCode ?? null,
      county: r.county ?? null,
      propertyType: r.propertyType ?? null,
      squareFootage: r.squareFootage ?? null,
      lastSaleDate: r.lastSaleDate ?? null,
      lastSalePrice: r.lastSalePrice ?? null,
      ownerName: r.owner?.names?.[0] ?? null,
    };
  }

  async searchByAddress(query: string): Promise<SearchResponse> {
    const rows = await this.call('/properties', { address: query });
    return { source: 'rentcast', results: rows.map((r) => this.map(r as Record<string, any>)) };
  }

  async recentCommercialSales(days: number, limit: number): Promise<SearchResponse> {
    // NOTE: confirm the exact commercial propertyType value against RentCast's
    // supported-types docs during integration; some commercial parcels also
    // surface under Land or unclassified types depending on county records.
    const rows = await this.call('/properties', {
      city: this.city,
      state: this.state,
      saleDateRange: String(days),
      propertyType: 'Commercial',
      limit: String(limit),
    });
    const mapped = rows.map((r) => this.map(r as Record<string, any>));
    mapped.sort((a, b) => (b.lastSalePrice ?? 0) - (a.lastSalePrice ?? 0));
    return { source: 'rentcast', results: mapped.slice(0, limit) };
  }
}

/** Sample provider — used when no key is configured. Always labeled source:'sample'. */
@Injectable()
export class SamplePropertyProvider implements PropertySearchProvider {
  private readonly samples: PropertyResult[] = [
    { id: 's1', address: '1240 Klumac Rd, Salisbury, NC 28144', city: 'Salisbury', state: 'NC', zip: '28144', county: 'Rowan', propertyType: 'Commercial', squareFootage: 42_000, lastSaleDate: this.daysAgo(2), lastSalePrice: 3_150_000, ownerName: 'Piedmont Industrial Partners LLC' },
    { id: 's2', address: '88 Union St S, Concord, NC 28025', city: 'Concord', state: 'NC', zip: '28025', county: 'Cabarrus', propertyType: 'Commercial', squareFootage: 11_500, lastSaleDate: this.daysAgo(4), lastSalePrice: 1_875_000, ownerName: 'Union Street Holdings' },
    { id: 's3', address: '415 E Center St, Lexington, NC 27292', city: 'Lexington', state: 'NC', zip: '27292', county: 'Davidson', propertyType: 'Commercial', squareFootage: 8_200, lastSaleDate: this.daysAgo(6), lastSalePrice: 940_000, ownerName: 'Center Street Retail LLC' },
  ];
  private daysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }

  async searchByAddress(query: string): Promise<SearchResponse> {
    const q = query.toLowerCase();
    const hits = this.samples.filter((s) => s.address.toLowerCase().includes(q));
    return { source: 'sample', results: hits.length ? hits : this.samples.slice(0, 1) };
  }
  async recentCommercialSales(_days: number, limit: number): Promise<SearchResponse> {
    return { source: 'sample', results: this.samples.slice(0, limit) };
  }
}
