import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { LeadWebhookSchema } from '@starnes/shared';

/**
 * lead-intake (§9): web-form intake (shared-secret header + strict Zod on
 * untrusted public input, per-IP rate limit); rule-based routing with
 * fallback assignee + flag on valid-but-unroutable.
 * TODO(C19): webhook controller, predicate evaluation, notification trigger.
 */
@Injectable()
export class LeadIntakeService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async intake(payload: unknown): Promise<{ leadId: string }> {
    const lead = LeadWebhookSchema.parse(payload);
    const { rows } = await this.pool.query(
      `INSERT INTO lead (name, contact_info, source) VALUES ($1, $2, $3) RETURNING id`,
      [lead.name, JSON.stringify({ email: lead.email, phone: lead.phone, message: lead.message }), lead.source],
    );
    return { leadId: rows[0].id };
  }
}
