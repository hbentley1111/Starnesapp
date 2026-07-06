import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { DEAL_TRACK_TYPES, OPPORTUNITY_STAGES, type OpportunityType } from '@starnes/shared';

/**
 * Project/Opportunity CRUD (broadened round 2, 13 types) + Needs/Criteria CRUD.
 * Deal-track types keep the 4-stage pipeline (Prospecting → Negotiating →
 * LOI → Due Diligence, configurable, CCQ-013); non-deal-track types use the
 * lighter Open/Active/Closed status. Soft-delete/void keeps the audit trail.
 *
 * TODO(B6): create/read/update endpoints, stage-transition validation
 * (confirm with client whether strict ordering or free-form — CCQ open edge),
 * need CRUD riding the same module (adjacent domain, same seam).
 */
@Injectable()
export class OpportunityService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  isDealTrack(type: OpportunityType): boolean {
    return DEAL_TRACK_TYPES.includes(type);
  }

  /** Stage transitions apply to deal-track types only. */
  assertValidStageTransition(type: OpportunityType, from: string, to: string): void {
    if (!this.isDealTrack(type)) throw new Error(`${type} is not a deal-track type; use status instead of stage`);
    const order = OPPORTUNITY_STAGES as readonly string[];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) throw new Error(`Unknown stage: ${from} → ${to}`);
    // Default: adjacent-or-backward moves allowed; skipping ahead needs confirmation (open client edge).
    if (toIdx > fromIdx + 1) throw new Error(`Stage skip ${from} → ${to} requires confirmation (strict ordering pending client answer)`);
  }
}
