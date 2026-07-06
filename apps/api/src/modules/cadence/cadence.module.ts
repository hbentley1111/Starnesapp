import { Module } from '@nestjs/common';
import { CadenceService } from './cadence.service';

@Module({ providers: [CadenceService], exports: [CadenceService] })
export class CadenceModule {}
