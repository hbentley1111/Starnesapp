import type { ExtractionOutput } from '@starnes/shared';

/**
 * Gold-set record (A7 / Spike S-1).
 * One JSON file per transcript in goldset/. The `expected` block is the
 * hand-labeled truth in the SAME shape as the model contract, minus
 * source_offset/confidence (labelers mark values; spans are validated
 * structurally by the gate, not scored here).
 */
export interface GoldValue<T = unknown> {
  value: T;
}

export interface GoldRecord {
  id: string;
  /** clean | messy_multiparty | low_signal — the set must include deliberately messy ones. */
  category: 'clean' | 'messy_multiparty' | 'low_signal';
  transcript: string;
  expected: {
    contact: GoldValue<{ full_name: string; emails: string[]; phones: string[] }> | null;
    company: GoldValue<{ name: string }> | null;
    property: GoldValue<{ address: string; asset_class: string | null }> | null;
    intent: GoldValue<string> | null;
    opportunity_type: GoldValue<string> | null;
    opportunity_stage_or_timeline: GoldValue<string> | null;
    next_actions: GoldValue<{ description: string; due_date: string | null }>[];
  };
  notes?: string;
}

export interface PredictionRecord {
  id: string;
  prediction: ExtractionOutput;
  model_id: string;
  prompt_version: string;
}

export interface FieldOutcome {
  goldId: string;
  fieldKey: string;
  outcome: 'tp' | 'fp' | 'fn' | 'tn';
  confidence: number | null; // null for tn/fn-with-no-prediction
  matched: boolean;
}
