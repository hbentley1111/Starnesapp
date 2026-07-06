import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { OpportunityService } from './opportunity.service';
import { ReadController } from './read.controller';

/** Contacts / Entity-Resolution / Opportunity-Pipeline (renamed round 2). */
@Module({ controllers: [ReadController], providers: [ContactsService, OpportunityService], exports: [ContactsService, OpportunityService] })
export class ContactsModule {}
