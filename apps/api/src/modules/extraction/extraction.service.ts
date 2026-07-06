import { Injectable } from '@nestjs/common';
import {
  CONFIDENCE_REVIEW_THRESHOLD,
  ExtractionOutputSchema,
  type ExtractionOutput,
} from '@starnes/shared';

/**
 * extraction (§4, the moat): Claude structured extraction →
 * property/contact/intent/next-action with provenance + confidence.
 *
 * Output Validation Gate (§4.4) — NO LLM output is trusted:
 *  1. zod schema re-validation on receipt (model is also schema-constrained)
 *  2. confidence < 0.75 → written but flagged needs_review (blocking)
 *  3. provenance: every field must reference a valid source_offset — a value
 *     with no traceable span is rejected as a likely hallucination
 *  4. prompt-injection: transcript delivered as delimited untrusted DATA;
 *     workers have no send/write tools; a human reviews every draft
 *  5. invalid output: one re-prompt → fallback model (Opus 4.8) once →
 *     park in needs_attention with raw output stored. Nothing partial commits.
 *
 * Models (§4.2): Sonnet 4.6 primary, Opus 4.8 escalation-only.
 * Prompts repo-versioned (extraction@v1); prompt_version + model_id stamped
 * on every extracted_entity row.
 *
 * TODO(C-block 2): Anthropic client, prompt templates, gold-set regression harness.
 */
@Injectable()
export class ExtractionService {
  static readonly PROMPT_VERSION = 'extraction@v1';
  static readonly PRIMARY_MODEL = 'claude-sonnet-4-6';
  static readonly FALLBACK_MODEL = 'claude-opus-4-8';

  /** Gate steps 1–3. Returns fields partitioned by review requirement. */
  validate(raw: unknown, transcriptLength: number): {
    output: ExtractionOutput;
    needsReview: string[];
  } {
    const output = ExtractionOutputSchema.parse(raw); // step 1

    const needsReview: string[] = [];
    const check = (key: string, field: { source_offset: { start: number; end: number }; confidence: number } | null) => {
      if (!field) return;
      const { start, end } = field.source_offset;
      if (end <= start || end > transcriptLength) {
        throw new Error(`Provenance violation on "${key}": span [${start},${end}) has no traceable transcript range`); // step 3
      }
      if (field.confidence < CONFIDENCE_REVIEW_THRESHOLD) needsReview.push(key); // step 2
    };

    check('contact', output.contact);
    check('company', output.company);
    check('property', output.property);
    check('intent', output.intent);
    check('opportunity_type', output.opportunity_type);
    check('opportunity_stage_or_timeline', output.opportunity_stage_or_timeline);
    output.next_actions.forEach((f, i) => check(`next_actions[${i}]`, f));

    return { output, needsReview };
  }
}
