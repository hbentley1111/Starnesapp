import { Module } from '@nestjs/common';
import { PrioritizationService } from './prioritization.service';

@Module({ providers: [PrioritizationService], exports: [PrioritizationService] })
export class PrioritizationModule {}
