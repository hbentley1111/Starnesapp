import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

export interface AuditEntry {
  actor: string; // user:<uuid> | worker:<id> | system
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Cross-cutting append-only audit service (§9): wraps all state transitions
 * and every external dispatch. The table itself blocks UPDATE/DELETE via
 * triggers, so this service is intentionally write-and-read-only.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (actor, action, entity_type, entity_id, before, after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.actor,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.before === undefined ? null : JSON.stringify(entry.before),
        entry.after === undefined ? null : JSON.stringify(entry.after),
      ],
    );
  }
}
