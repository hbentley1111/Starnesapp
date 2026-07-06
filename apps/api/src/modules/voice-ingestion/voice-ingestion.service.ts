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
}
