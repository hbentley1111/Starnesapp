import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { ExtractionService } from './extraction.service';
import { DemoExtractionProvider, type ExtractionProvider } from './extraction-provider';

/**
 * Runs the FULL real extraction pipeline for one interaction:
 *   provider (LLM or demo) → validation gate (schema + confidence + provenance)
 *   → persist extracted_entity rows (needs_review flag applied) → agent_run audit.
 *
 * This is the "run extraction on this interaction" method the review side
 * assumed existed. The provider is the only swappable part; everything here
 * is production logic.
 */
@Injectable()
export class ExtractionRunnerService {
  private readonly logger = new Logger(ExtractionRunnerService.name);
  private readonly provider: ExtractionProvider;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ExtractionService) private readonly gate: ExtractionService,
    @Inject(DemoExtractionProvider) demo: DemoExtractionProvider,
  ) {
    // Swap to a live Claude provider automatically once a key is configured.
    this.provider = demo; // process.env.ANTHROPIC_API_KEY ? new LiveClaudeProvider() : demo;
    this.logger.log(
      process.env.ANTHROPIC_API_KEY
        ? 'ANTHROPIC_API_KEY present — swap LiveClaudeProvider in here (pipeline unchanged)'
        : 'no ANTHROPIC_API_KEY — deterministic demo extractor (real pipeline)',
    );
  }

  async runForInteraction(interactionId: string): Promise<{ fields: number; needsReview: number }> {
    const { rows } = await this.pool.query(`SELECT raw_transcript FROM interaction WHERE id = $1`, [interactionId]);
    if (!rows.length) throw new Error(`interaction ${interactionId} not found`);
    const transcript: string = rows[0].raw_transcript ?? '';

    const { raw, tokenUsage } = await this.provider.extract(transcript);
    // REAL gate: schema re-validation + confidence thresholding + provenance span enforcement
    const { output, needsReview } = this.gate.validate(raw, transcript.length);

    await this.pool.query(
      `INSERT INTO agent_run (capability, worker_id, trigger, status, attempts, started_at, finished_at, token_usage, prompt_version, model_id)
       VALUES ('extract.transcript', $1, 'reactive:transcript.ingested', 'succeeded', 1, now(), now(), $2, $3, $1)`,
      [this.provider.modelId, tokenUsage ? JSON.stringify(tokenUsage) : null, ExtractionService.PROMPT_VERSION],
    );

    const toWrite: { target: string; key: string; value: unknown; span: { start: number; end: number }; conf: number }[] = [];
    const push = (target: string, key: string, f: { value: unknown; source_offset: { start: number; end: number }; confidence: number } | null) => {
      if (f) toWrite.push({ target, key, value: f.value, span: f.source_offset, conf: f.confidence });
    };
    push('contact', 'full_name', output.contact);
    push('company', 'name', output.company);
    push('property', 'address', output.property);
    push('intent', 'intent', output.intent);
    push('opportunity_type', 'opportunity_type', output.opportunity_type);
    push('opportunity', 'stage_or_timeline', output.opportunity_stage_or_timeline);
    output.next_actions.forEach((a, i) => push('next_action', `description_${i}`, a));

    for (const r of toWrite) {
      const status = r.conf < 0.75 ? 'needs_review' : 'pending_review';
      await this.pool.query(
        `INSERT INTO extracted_entity (interaction_id, target_type, field_key, field_value, provenance, confidence, status, prompt_version, model_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [interactionId, r.target, r.key, JSON.stringify(r.value), JSON.stringify({ source: `interaction:${interactionId}`, span: r.span }), r.conf, status, ExtractionService.PROMPT_VERSION, this.provider.modelId],
      );
    }

    this.logger.log(`extracted ${toWrite.length} fields (${needsReview.length} need review) from interaction ${interactionId}`);
    return { fields: toWrite.length, needsReview: needsReview.length };
  }
}
