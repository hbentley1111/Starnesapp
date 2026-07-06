import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { RentCastProvider, SamplePropertyProvider, type PropertySearchProvider, type SearchResponse } from './property-search.provider';

/**
 * Property search backed by RentCast (server-side key). Falls back to labeled
 * sample data when RENTCAST_API_KEY is absent, so the UI is honest about its
 * source either way.
 */
@Controller('market')
export class MarketDataController {
  private readonly provider: PropertySearchProvider;

  constructor(
    @Inject(RentCastProvider) rentcast: RentCastProvider,
    @Inject(SamplePropertyProvider) sample: SamplePropertyProvider,
  ) {
    this.provider = process.env.RENTCAST_API_KEY ? rentcast : sample;
  }

  @Get('property-search')
  async search(@Query('q') q: string): Promise<SearchResponse> {
    const query = z.string().min(3).max(200).parse(q);
    return this.provider.searchByAddress(query);
  }

  @Get('recent-sales')
  async recentSales(@Query('days') days?: string, @Query('limit') limit?: string): Promise<SearchResponse> {
    const d = Math.min(Math.max(Number(days ?? 7) || 7, 1), 90);
    const l = Math.min(Math.max(Number(limit ?? 3) || 3, 1), 10);
    return this.provider.recentCommercialSales(d, l);
  }
}
