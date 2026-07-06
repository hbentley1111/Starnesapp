import type { ExtractionOutput } from '@starnes/shared';
import type { FieldOutcome, GoldRecord } from './types';

/**
 * Field-level scoring (§1.7 quality bar):
 *   precision ≥ 0.92, recall ≥ 0.85 on the labeled gold set.
 *
 * Matching rules (v1, deterministic):
 *  - strings: normalized compare (lowercase, collapse whitespace, strip punctuation)
 *  - phones: digits-only compare; emails: lowercase compare
 *  - a predicted value where gold is null      → FP
 *  - a missing prediction where gold is non-null → FN
 *  - a mismatched value                          → FP + FN (wrong AND missed)
 *  - both null                                   → TN (tracked, excluded from P/R)
 *  - next_actions: order-insensitive set match on normalized description
 *
 * Rationale mirrors the architecture: a wrong-but-confident field silently
 * corrupts the CRM (precision weighted over recall); a missed field surfaces
 * as needs-review — the human gate is the recall safety net.
 */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}@. ]/gu, ' ').replace(/\s+/g, ' ').trim();
const normPhone = (s: string) => s.replace(/\D/g, '');

function valuesMatch(fieldKey: string, predicted: unknown, gold: unknown): boolean {
  if (fieldKey === 'contact') {
    const p = predicted as { full_name: string; emails: string[]; phones: string[] };
    const g = gold as { full_name: string; emails: string[]; phones: string[] };
    const emailsOk = g.emails.every((e) => p.emails.map((x) => x.toLowerCase()).includes(e.toLowerCase()));
    const phonesOk = g.phones.every((ph) => p.phones.map(normPhone).includes(normPhone(ph)));
    return norm(p.full_name) === norm(g.full_name) && emailsOk && phonesOk;
  }
  if (fieldKey === 'company') return norm((predicted as { name: string }).name) === norm((gold as { name: string }).name);
  if (fieldKey === 'property') {
    const p = predicted as { address: string; asset_class: string | null };
    const g = gold as { address: string; asset_class: string | null };
    const classOk = g.asset_class === null || norm(p.asset_class ?? '') === norm(g.asset_class);
    return norm(p.address) === norm(g.address) && classOk;
  }
  if (typeof predicted === 'string' && typeof gold === 'string') return norm(predicted) === norm(gold);
  return JSON.stringify(predicted) === JSON.stringify(gold);
}

const SINGLETON_FIELDS = ['contact', 'company', 'property', 'intent', 'opportunity_type', 'opportunity_stage_or_timeline'] as const;

export function scoreRecord(gold: GoldRecord, prediction: ExtractionOutput): FieldOutcome[] {
  const outcomes: FieldOutcome[] = [];

  for (const key of SINGLETON_FIELDS) {
    const p = prediction[key];
    const g = gold.expected[key];
    if (!p && !g) {
      outcomes.push({ goldId: gold.id, fieldKey: key, outcome: 'tn', confidence: null, matched: true });
    } else if (p && !g) {
      outcomes.push({ goldId: gold.id, fieldKey: key, outcome: 'fp', confidence: p.confidence, matched: false });
    } else if (!p && g) {
      outcomes.push({ goldId: gold.id, fieldKey: key, outcome: 'fn', confidence: null, matched: false });
    } else if (p && g) {
      if (valuesMatch(key, p.value, g.value)) {
        outcomes.push({ goldId: gold.id, fieldKey: key, outcome: 'tp', confidence: p.confidence, matched: true });
      } else {
        outcomes.push({ goldId: gold.id, fieldKey: key, outcome: 'fp', confidence: p.confidence, matched: false });
        outcomes.push({ goldId: gold.id, fieldKey: key, outcome: 'fn', confidence: null, matched: false });
      }
    }
  }

  // next_actions: greedy set match on normalized description
  const remainingGold = [...gold.expected.next_actions];
  for (const p of prediction.next_actions) {
    const idx = remainingGold.findIndex((g) => norm(g.value.description) === norm(p.value.description));
    if (idx >= 0) {
      remainingGold.splice(idx, 1);
      outcomes.push({ goldId: gold.id, fieldKey: 'next_actions', outcome: 'tp', confidence: p.confidence, matched: true });
    } else {
      outcomes.push({ goldId: gold.id, fieldKey: 'next_actions', outcome: 'fp', confidence: p.confidence, matched: false });
    }
  }
  for (const _missed of remainingGold) {
    outcomes.push({ goldId: gold.id, fieldKey: 'next_actions', outcome: 'fn', confidence: null, matched: false });
  }

  return outcomes;
}

export interface EvalReport {
  totals: { tp: number; fp: number; fn: number; tn: number };
  precision: number;
  recall: number;
  passPrecision: boolean; // ≥ 0.92
  passRecall: boolean;    // ≥ 0.85
  perField: Record<string, { tp: number; fp: number; fn: number; precision: number; recall: number }>;
  calibration: {
    /** committed band (confidence ≥ 0.75): accuracy among emitted fields — must be precise */
    autoCommitBand: { n: number; correct: number; accuracy: number };
    /** review band (< 0.75): forced to human review — expected to be noisier */
    reviewBand: { n: number; correct: number; accuracy: number };
    /** calibration holds when the auto-commit band meets the precision bar on its own */
    autoCommitMeetsBar: boolean;
  };
}

export function buildReport(outcomes: FieldOutcome[]): EvalReport {
  const count = (o: FieldOutcome['outcome']) => outcomes.filter((x) => x.outcome === o).length;
  const tp = count('tp');
  const fp = count('fp');
  const fn = count('fn');
  const tn = count('tn');
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  const perField: EvalReport['perField'] = {};
  for (const key of new Set(outcomes.map((o) => o.fieldKey))) {
    const f = outcomes.filter((o) => o.fieldKey === key);
    const ftp = f.filter((o) => o.outcome === 'tp').length;
    const ffp = f.filter((o) => o.outcome === 'fp').length;
    const ffn = f.filter((o) => o.outcome === 'fn').length;
    perField[key] = {
      tp: ftp, fp: ffp, fn: ffn,
      precision: ftp + ffp === 0 ? 1 : ftp / (ftp + ffp),
      recall: ftp + ffn === 0 ? 1 : ftp / (ftp + ffn),
    };
  }

  const emitted = outcomes.filter((o) => o.confidence !== null);
  const band = (pred: (c: number) => boolean) => {
    const items = emitted.filter((o) => pred(o.confidence as number));
    const correct = items.filter((o) => o.outcome === 'tp').length;
    return { n: items.length, correct, accuracy: items.length === 0 ? 1 : correct / items.length };
  };
  const autoCommitBand = band((c) => c >= 0.75);
  const reviewBand = band((c) => c < 0.75);

  return {
    totals: { tp, fp, fn, tn },
    precision,
    recall,
    passPrecision: precision >= 0.92,
    passRecall: recall >= 0.85,
    perField,
    calibration: { autoCommitBand, reviewBand, autoCommitMeetsBar: autoCommitBand.accuracy >= 0.92 },
  };
}
