/**
 * Gold-set eval runner (A7 / Spike S-1) — doubles as the prompt regression gate:
 * any prompt edit runs against the full gold set before shipping; a regression
 * on precision/recall/calibration blocks the change (nonzero exit).
 *
 * Modes:
 *   ANTHROPIC_API_KEY=... npm run eval          → live extraction, then score
 *   npm run eval -- --predictions <file.json>   → offline scoring of stored predictions (CI / harness dev)
 *
 * Outputs eval-report.json next to the gold set.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExtractionOutput } from '@starnes/shared';
import { extractViaApi } from './anthropic';
import { buildReport, scoreRecord } from './score';
import type { FieldOutcome, GoldRecord, PredictionRecord } from './types';

const GOLDSET_DIR = join(__dirname, '..', 'goldset');

async function main() {
  const args = process.argv.slice(2);
  const predIdx = args.indexOf('--predictions');
  const predictionsPath = predIdx >= 0 ? args[predIdx + 1] : null;

  const goldFiles = readdirSync(GOLDSET_DIR).filter((f) => f.endsWith('.json')).sort();
  const gold: GoldRecord[] = goldFiles.map((f) => JSON.parse(readFileSync(join(GOLDSET_DIR, f), 'utf8')));
  if (gold.length === 0) throw new Error('gold set is empty');
  console.log(`gold set: ${gold.length} transcripts (${gold.filter((g) => g.category === 'messy_multiparty').length} messy, ${gold.filter((g) => g.category === 'low_signal').length} low-signal)`);

  const predictions = new Map<string, ExtractionOutput>();
  if (predictionsPath) {
    const stored: PredictionRecord[] = JSON.parse(readFileSync(predictionsPath, 'utf8'));
    for (const p of stored) predictions.set(p.id, p.prediction);
    console.log(`offline mode: scoring ${stored.length} stored predictions from ${predictionsPath}`);
  } else {
    for (const g of gold) {
      process.stdout.write(`extracting ${g.id}... `);
      const result = await extractViaApi(g.transcript);
      predictions.set(g.id, result.parsed);
      console.log(`${result.model_id} (${result.usage.input}in/${result.usage.output}out)`);
    }
  }

  const outcomes: FieldOutcome[] = [];
  for (const g of gold) {
    const pred = predictions.get(g.id);
    if (!pred) throw new Error(`no prediction for gold record ${g.id}`);
    outcomes.push(...scoreRecord(g, pred));
  }

  const report = buildReport(outcomes);
  writeFileSync(join(GOLDSET_DIR, '..', 'eval-report.json'), JSON.stringify({ report, outcomes }, null, 2));

  console.log('\n== field-level results ==');
  for (const [key, f] of Object.entries(report.perField)) {
    console.log(`  ${key.padEnd(30)} P=${f.precision.toFixed(2)} R=${f.recall.toFixed(2)}  (tp=${f.tp} fp=${f.fp} fn=${f.fn})`);
  }
  console.log('\n== quality bar (§1.7) ==');
  console.log(`  precision ${report.precision.toFixed(3)}  ${report.passPrecision ? 'PASS' : 'FAIL'} (bar 0.92)`);
  console.log(`  recall    ${report.recall.toFixed(3)}  ${report.passRecall ? 'PASS' : 'FAIL'} (bar 0.85)`);
  console.log('\n== confidence calibration (threshold 0.75) ==');
  const c = report.calibration;
  console.log(`  auto-commit band (>=0.75): n=${c.autoCommitBand.n} accuracy=${c.autoCommitBand.accuracy.toFixed(3)} ${c.autoCommitMeetsBar ? 'OK' : 'MISCALIBRATED'}`);
  console.log(`  review band     (<0.75):  n=${c.reviewBand.n} accuracy=${c.reviewBand.accuracy.toFixed(3)} (routed to mandatory human review)`);

  const pass = report.passPrecision && report.passRecall && c.autoCommitMeetsBar;
  console.log(`\n${pass ? 'EVAL PASSED' : 'EVAL FAILED — blocks prompt/model change'}`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
