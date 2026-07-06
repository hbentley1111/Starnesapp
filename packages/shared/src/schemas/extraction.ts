import { z } from 'zod';
import { ACTIVITY_TYPES, NEED_TYPES, OPPORTUNITY_STAGES, OPPORTUNITY_TYPES } from '../types/entities';

/**
 * Schema-constrained extraction contract (F-M3, the moat).
 * Every field carries { value, source_offset, confidence } — provenance
 * enforcement rejects any value without a traceable transcript span.
 * The model is constrained to this schema AND the result is re-validated
 * on receipt (Output Validation Gate §4.4). Small and bounded by design
 * (~6–8 fields), not a 100-field form.
 */

export const SourceOffsetSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});

export const ExtractedFieldSchema = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value,
    source_offset: SourceOffsetSchema,
    confidence: z.number().min(0).max(1),
  });

export const ExtractionOutputSchema = z.object({
  contact: ExtractedFieldSchema(
    z.object({
      full_name: z.string().min(1),
      emails: z.array(z.string()).default([]),
      phones: z.array(z.string()).default([]),
    }),
  ).nullable(),
  company: ExtractedFieldSchema(z.object({ name: z.string().min(1) })).nullable(),
  property: ExtractedFieldSchema(
    z.object({
      address: z.string().min(1),
      asset_class: z.string().nullable().default(null),
    }),
  ).nullable(),
  intent: ExtractedFieldSchema(z.string().min(1)).nullable(),
  opportunity_type: ExtractedFieldSchema(z.enum(OPPORTUNITY_TYPES)).nullable(), // added round 2
  opportunity_stage_or_timeline: ExtractedFieldSchema(
    z.union([z.enum(OPPORTUNITY_STAGES), z.string()]),
  ).nullable(),
  next_actions: z.array(
    ExtractedFieldSchema(
      z.object({
        description: z.string().min(1),
        due_date: z.string().date().nullable().default(null),
      }),
    ),
  ).default([]),
});
export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/** Fields below this confidence are written but forced into mandatory human review (§1.7). */
export const CONFIDENCE_REVIEW_THRESHOLD = 0.75;

/** Manual activity log entry (round 2) — requires at-least-one linkage. */
export const ManualActivitySchema = z
  .object({
    activity_type: z.enum(ACTIVITY_TYPES),
    occurred_at: z.string().datetime(),
    notes: z.string().default(''),
    contact_id: z.string().uuid().nullable().default(null),
    property_id: z.string().uuid().nullable().default(null),
    opportunity_id: z.string().uuid().nullable().default(null),
  })
  .refine((v) => v.contact_id || v.property_id || v.opportunity_id, {
    message: 'A manual activity must link to at least one of contact, property, or opportunity.',
  });
export type ManualActivity = z.infer<typeof ManualActivitySchema>;

/** Needs/Criteria capture (round 2) — manually entered, NOT LLM-derived. */
export const NeedSchema = z.object({
  need_type: z.enum(NEED_TYPES),
  asset_type: z.string().nullable().default(null),
  geography: z.string().nullable().default(null),
  size_min: z.number().nullable().default(null),
  size_max: z.number().nullable().default(null),
  price_min: z.number().nullable().default(null),
  price_max: z.number().nullable().default(null),
  lease_sale_preference: z.enum(['lease', 'sale', 'either']).nullable().default(null),
  timing: z.string().nullable().default(null),
  motivation_level: z.string().nullable().default(null),
  priority: z.enum(['high', 'medium', 'low']).nullable().default(null),
  contact_id: z.string().uuid().nullable().default(null),
  company_id: z.string().uuid().nullable().default(null),
  property_id: z.string().uuid().nullable().default(null),
  notes: z.string().default(''),
  status: z.enum(['open', 'fulfilled', 'closed']).default('open'),
});
export type NeedInput = z.infer<typeof NeedSchema>;
