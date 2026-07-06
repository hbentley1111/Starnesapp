import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { Pool } from 'pg';
import { z } from 'zod';
import { PG_POOL } from '../../database/database.module';
import { AuditService } from '../../common/audit/audit.service';

const ReviewBody = z.object({
  decisions: z.array(
    z.object({
      entityId: z.string().uuid(),
      action: z.enum(['accept', 'edit', 'reject']),
      value: z.string().optional(),
    }),
  ).min(1),
});

/** Extraction review — accepted corrections write NEW supersession versions; nothing mutates in place. */
@Controller('extractions')
export class ExtractionController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool, @Inject(AuditService) private readonly audit: AuditService) {}

  @Get('pending')
  async pending() {
    const { rows } = await this.pool.query(`
      SELECT i.id AS interaction_id, i.occurred_at, i.source, c.full_name AS contact,
             json_agg(json_build_object(
               'entityId', e.id, 'fieldKey', e.field_key, 'targetType', e.target_type,
               'value', e.field_value, 'confidence', e.confidence, 'status', e.status
             ) ORDER BY e.created_at) AS fields
      FROM interaction i
      JOIN extracted_entity e ON e.interaction_id = i.id AND e.is_current AND e.status IN ('pending_review','needs_review')
      LEFT JOIN contact c ON c.id = i.contact_id
      GROUP BY i.id, c.full_name
      ORDER BY i.occurred_at DESC`);
    return rows;
  }

  @Post(':interactionId/review')
  async review(@Param('interactionId') interactionId: string, @Body() raw: unknown) {
    const body = ReviewBody.parse(raw);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const d of body.decisions) {
        const { rows } = await client.query(
          `SELECT * FROM extracted_entity WHERE id = $1 AND interaction_id = $2 AND is_current`,
          [d.entityId, interactionId],
        );
        if (!rows.length) throw new NotFoundException(`extracted_entity ${d.entityId} not found/current`);
        const cur = rows[0];
        if (d.action === 'reject') {
          await client.query(`UPDATE extracted_entity SET status = 'rejected' WHERE id = $1`, [d.entityId]);
          continue;
        }
        const value = d.action === 'edit' && d.value !== undefined ? d.value : cur.field_value;
        const ins = await client.query(
          `INSERT INTO extracted_entity (interaction_id, target_type, field_key, field_value, provenance, confidence, status, prompt_version, model_id)
           VALUES ($1,$2,$3,$4,$5,$6,'accepted',$7,$8) RETURNING id`,
          [interactionId, cur.target_type, cur.field_key, JSON.stringify(value), cur.provenance, cur.confidence, cur.prompt_version, cur.model_id],
        );
        await client.query(`UPDATE extracted_entity SET is_current = false, superseded_by = $2 WHERE id = $1`, [d.entityId, ins.rows[0].id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    await this.audit.record({ actor: 'user:dev', action: 'extraction.review', entityType: 'interaction', entityId: interactionId, after: { decisions: body.decisions.length } });
    return { reviewed: body.decisions.length };
  }
}
