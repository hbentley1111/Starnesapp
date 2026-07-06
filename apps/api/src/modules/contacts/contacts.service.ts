import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

/**
 * Contact/company CRUD (round 2: optional investor-profile field group),
 * plus dedup + entity resolution:
 *   blocking keys → fuzzy scoring → merge-survivorship → idempotent re-runs.
 * Conservative thresholds; NO auto-merge in the ambiguity band; merges are
 * reversible via entity_merge_log survivorship.
 *
 * Append-only supersession: updates insert a new version row and flip
 * is_current — see newVersion() below for the canonical pattern.
 *
 * TODO(B6/C16): full CRUD endpoints, blocking-key candidate generation,
 * scored review queue, merge UI (S2) endpoints.
 */
@Injectable()
export class ContactsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Canonical supersession write: never UPDATE business fields in place. */
  async newVersion(contactId: string, patch: Record<string, unknown>, actor: string): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`SELECT * FROM contact WHERE id = $1 AND is_current`, [contactId]);
      if (!rows.length) throw new Error(`contact ${contactId} not found or not current`);
      const current = rows[0];
      const next = { ...current, ...patch };
      const insert = await client.query(
        `INSERT INTO contact (full_name, normalized_name, emails, phones, company_id, owner_user_id, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [next.full_name, next.normalized_name, next.emails, next.phones, next.company_id, next.owner_user_id, current.version + 1],
      );
      const newId: string = insert.rows[0].id;
      await client.query(`UPDATE contact SET is_current = false, superseded_by = $2 WHERE id = $1`, [contactId, newId]);
      await client.query(
        `INSERT INTO audit_log (actor, action, entity_type, entity_id, before, after)
         VALUES ($1, 'contact.supersede', 'contact', $2, $3, $4)`,
        [actor, newId, JSON.stringify({ superseded: contactId }), JSON.stringify(patch)],
      );
      await client.query('COMMIT');
      return newId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
