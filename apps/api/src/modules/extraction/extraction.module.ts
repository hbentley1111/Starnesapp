import { Module } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { ExtractionController } from './extraction.controller';

@Module({ controllers: [ExtractionController], providers: [ExtractionService], exports: [ExtractionService] })
export class ExtractionModule {}
