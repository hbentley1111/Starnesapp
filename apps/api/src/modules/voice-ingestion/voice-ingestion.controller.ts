import { Body, Controller, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { VoiceIngestionService } from './voice-ingestion.service';
import { ExtractionRunnerService } from '../extraction/extraction-runner.service';

const CaptureNoteBody = z.object({
  transcript: z.string().min(10, 'Note is too short to extract from').max(20000),
});

const ManualActivityBody = z.object({
  activity_type: z.string(),
  occurred_at: z.string(),
  notes: z.string().default(''),
  contact_id: z.string().uuid().nullable().optional(),
  property_id: z.string().uuid().nullable().optional(),
  opportunity_id: z.string().uuid().nullable().optional(),
});

/**
 * Voice/manual ingestion HTTP surface.
 *
 * POST /voice/manual  — capture a fresh dictated/typed note. Persists it as an
 *   interaction (no prior linkage required — extraction figures out who it's
 *   about), then runs the REAL extraction pipeline so extracted_entity rows
 *   appear at the review gate with confidences + pending_review/needs_review.
 *
 * POST /voice/activity — log a KNOWN activity already tied to a
 *   contact/property/opportunity (at-least-one-linkage enforced). No extraction.
 *
 * The live Fireflies webhook + PWA upload paths remain C-block 1; both converge
 * on the same runner.
 */
@Controller('voice')
export class VoiceIngestionController {
  constructor(
    @Inject(VoiceIngestionService) private readonly ingestion: VoiceIngestionService,
    @Inject(ExtractionRunnerService) private readonly extraction: ExtractionRunnerService,
  ) {}

  @Post('manual')
  async captureNote(@Body() raw: unknown) {
    const { transcript } = CaptureNoteBody.parse(raw);
    const { interactionId, deduped } = await this.ingestion.captureNote(transcript);
    const result = await this.extraction.runForInteraction(interactionId);
    return { interactionId, deduped, ...result };
  }

  @Post('activity')
  async logActivity(@Body() raw: unknown) {
    const body = ManualActivityBody.parse(raw);
    return this.ingestion.logManualActivity(body);
  }
}
