import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { ManualActivitySchema, type ManualActivity } from "@starnes/shared";

/**
 * voice-ingestion (§9, extended round 2):
 *  in:  Fireflies webhook/poll, PWA audio/text, manual activity-log submission
 *  out: persisted interaction → transcript.ingested / activity.logged
 *
 * TODO(C-block 1): Fireflies HMAC-SHA256 verify (x-hub-signature),
 * GraphQL transcript fetch, hourly reconciliation poll backstop,
 * PWA chunked/resumable upload.
 */
@Injectable()
export class VoiceIngestionService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Idempotency: content hash of normalized text — duplicate webhook / re-upload / retry is a no-op. */
  contentHash(normalizedText: string): string {
    return createHash("sha256").update(normalizedText).digest("hex");
  }

  /** Manual activity logging (round 2) — activities that never pass through Fireflies/PWA. */
  async logManualActivity(input: unknown): Promise<{ interactionId: string }> {
    const activity: ManualActivity = ManualActivitySchema.parse(input); // at-least-one-linkage enforced by schema
    const { rows } = await this.pool.query(
      `INSERT INTO interaction (source, activity_type, raw_transcript, occurred_at, contact_id, property_id, opportunity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['manual', activity.activity_type, activity.notes, activity.occurred_at, activity.contact_id, activity.property_id, activity.opportunity_id],
    );
    return { interactionId: rows[0].id };
  }

  /**
   * Capture a fresh dictated/typed note. Unlike logManualActivity, this needs
   * NO prior linkage — the whole point is that extraction infers who it is
   * about. Idempotent on content hash: re-submitting the same note reuses the
   * interaction and clears its prior extractions so a re-demo is clean.
   */
  async captureNote(transcript: string): Promise<{ interactionId: string; deduped: boolean }> {
    const hash = this.contentHash(transcript.trim().toLowerCase());
    const existing = await this.pool.query(`SELECT id FROM interaction WHERE content_hash = $1`, [hash]);
    if (existing.rows.length) {
      const interactionId: string = existing.rows[0].id;
      await this.pool.query(`UPDATE extracted_entity SET is_current = false WHERE interaction_id = $1`, [interactionId]);
      return { interactionId, deduped: true };
    }
    const { rows } = await this.pool.query(
      `INSERT INTO interaction (source, activity_type, external_id, content_hash, raw_transcript, occurred_at)
       VALUES ('pwa', 'transcript', $1, $2, $3, now()) RETURNING id`,
      [`manual-${hash.slice(0, 12)}`, hash, transcript],
    );
    return { interactionId: rows[0].id, deduped: false };
  }

}
