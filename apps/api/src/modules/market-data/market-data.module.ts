import { Module } from '@nestjs/common';
import { MarketDataController } from './market-data.controller';
import { RentCastProvider, SamplePropertyProvider } from './property-search.provider';

@Module({
  controllers: [MarketDataController],
  providers: [RentCastProvider, SamplePropertyProvider],
})
export class MarketDataModule {}
