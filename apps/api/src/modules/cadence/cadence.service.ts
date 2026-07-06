import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { CadenceTier } from '@starnes/shared';

/**
 * cadence (§9): 30/60/90 cadence state-machine; follow-up tracking;
 * requests LLM drafts (draft requests flow → HITL, never sent directly).
 * Edges: holidays, last-touch reset, snooze.
 * TODO(C-block 4).
 */
@Injectable()
export class CadenceService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  nextDue(lastTouch: Date, tier: CadenceTier): Date {
    const due = new Date(lastTouch);
    due.setDate(due.getDate() + tier);
    return due;
  }
}
