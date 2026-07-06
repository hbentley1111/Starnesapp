import { Module } from '@nestjs/common';
import { LeadIntakeService } from './lead-intake.service';

@Module({ providers: [LeadIntakeService], exports: [LeadIntakeService] })
export class LeadIntakeModule {}
