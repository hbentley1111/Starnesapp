import { Injectable, Logger } from '@nestjs/common';
import type { ExtractionOutput } from '@starnes/shared';

/**
 * The one seam between "real pipeline" and "which brain runs it."
 *
 * Everything downstream — the Zod validation gate, confidence thresholding,
 * provenance/span enforcement, needs_review flagging — is REAL and runs
 * identically regardless of provider. Only the model call is swapped. Setting
 * ANTHROPIC_API_KEY flips from this deterministic demo provider to a live
 * Claude call (C-block 2); no other code changes.
 */
export interface ExtractionProvider {
  readonly modelId: string;
  extract(transcript: string): Promise<{ raw: unknown; tokenUsage?: { input: number; output: number } }>;
}

/**
 * Demo provider — deterministic, offline, no API key. Produces realistic
 * commercial-RE extractions from transcript cues, and deliberately emits a
 * LOW-CONFIDENCE, slightly-wrong field when the transcript is garbled
 * (crosstalk markers, "bad line", mis-heard numbers) so the review gate has
 * a genuine error to catch on stage. This stands in for the LLM only —
 * the pipeline around it is production code.
 */
@Injectable()
export class DemoExtractionProvider implements ExtractionProvider {
  readonly modelId = 'demo-extractor@v1';
  private readonly logger = new Logger(DemoExtractionProvider.name);

  async extract(transcript: string): Promise<{ raw: unknown; tokenUsage: { input: number; output: number } }> {
    const t = transcript.toLowerCase();
    const garbled = /\[inaudible\]|\[crosstalk\]|speaker \d|bad line|you cut out|--|cut out/.test(t);

    const span = (needle: string): { start: number; end: number } => {
      const i = transcript.toLowerCase().indexOf(needle.toLowerCase());
      return i >= 0 ? { start: i, end: i + needle.length } : { start: 0, end: Math.min(transcript.length, 20) };
    };
    const field = <T>(value: T, needle: string, confidence: number) => ({ value, source_offset: span(needle), confidence });

    const nameMatch = transcript.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/);
    const emailMatch = transcript.match(/[\w.+-]+@[\w.-]+\.\w+/);
    const phoneMatch = transcript.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    const companyMatch = transcript.match(/\b([A-Z][A-Za-z]+ (?:Logistics|Holdings|Capital|Group|Partners|Realty|Properties|Ventures))\b/);
    const addressMatch = transcript.match(/\b(\d{2,5} [A-Z][A-Za-z ]+?(?:Highway|Hwy|Street|St|Road|Rd|Avenue|Ave|Tryon|Boulevard|Blvd))\b/);

    const sqft = /(\d[\d,]*)\s*(?:square feet|sq ?ft|k sqft|thousand square)/i.test(transcript);
    const isSell = /\bsell(ing)?\b|\bdisposition\b|\blist(ing)?\b/.test(t);
    const isBuy = /\bbuy(er)?\b|\backquisition\b|\blooking for\b|\bneeds?\b/.test(t);
    const isInvestor = /\binvest|\bplace\b.*\$|\bcapital\b|\baccredited\b/.test(t);
    const isOwnerIntel = /\bhold(ing)?\b|\bnot going to keep\b|\bthinking about\b|\bdown the road\b/.test(t);

    const opportunityType = isInvestor ? 'investor_opportunity'
      : isOwnerIntel ? 'owner_intel'
      : isSell ? 'listing'
      : isBuy || sqft ? 'tenant_requirement'
      : 'follow_up_project';

    const raw: Partial<ExtractionOutput> = {
      contact: nameMatch ? field({ full_name: nameMatch[1], emails: emailMatch ? [emailMatch[0]] : [], phones: phoneMatch ? [phoneMatch[0]] : [] }, nameMatch[1], garbled ? 0.82 : 0.95) : null,
      company: companyMatch ? field({ name: companyMatch[1] }, companyMatch[1], garbled ? 0.6 : 0.93) : null,
      property: addressMatch
        // when garbled, transpose the first two digits of the street number → the classic mis-heard address, LOW confidence
        ? field({ address: garbled ? addressMatch[1].replace(/^(\d)(\d)/, '$2$1') : addressMatch[1], asset_class: /office/.test(t) ? 'office' : /warehouse|industrial|flex/.test(t) ? 'industrial' : /retail/.test(t) ? 'retail' : null }, addressMatch[1], garbled ? 0.55 : 0.9)
        : null,
      intent: field(
        isInvestor ? 'Investor with capital to place' : isOwnerIntel ? 'Owner weighing a future sale' : isSell ? 'Seller/listing opportunity' : sqft ? 'Tenant space requirement' : 'Relationship follow-up',
        nameMatch?.[1] ?? transcript.slice(0, 12),
        garbled ? 0.78 : 0.9,
      ),
      opportunity_type: field(opportunityType, nameMatch?.[1] ?? transcript.slice(0, 12), garbled ? 0.8 : 0.88) as ExtractionOutput['opportunity_type'],
      opportunity_stage_or_timeline: /(\d+)[-\s]?(?:to|-)[-\s]?(\d+)\s*months?|within (?:six|three|twelve|\d+) months?|next (?:week|month|quarter)/i.test(transcript)
        ? field((transcript.match(/(\d+)[-\s]?(?:to|-)[-\s]?(\d+)\s*months?|within (?:six|three|twelve|\d+) months?|next (?:week|month|quarter)/i) as RegExpMatchArray)[0], 'month', 0.75)
        : null,
      next_actions: this.nextActions(transcript).map((a) => field({ description: a, due_date: null }, a.split(' ').slice(0, 2).join(' '), 0.9)),
    };

    this.logger.log(garbled ? 'garbled transcript → low-confidence field emitted for review' : 'clean transcript → high confidence');
    return { raw, tokenUsage: { input: Math.ceil(transcript.length / 4), output: 180 } };
  }

  private nextActions(transcript: string): string[] {
    const out: string[] = [];
    const t = transcript.toLowerCase();
    if (/send|share|email over|get.*(options|comps|om)/.test(t)) out.push('Send options/materials to contact');
    if (/tour|walk|site visit|show/.test(t)) out.push('Schedule site tour');
    if (/circle back|follow up|call.*(back|next)|reconnect/.test(t)) out.push('Follow up with contact');
    return out.length ? out : ['Log follow-up'];
  }
}

export const EXTRACTION_PROVIDER = Symbol('EXTRACTION_PROVIDER');
