# Gold-Set Labeling Guide (A7 / Spike S-1)

Target: **30–50 transcripts**, hand-labeled, including deliberately messy ones.
This set is the quality bar for extraction (§1.7: field-level precision ≥ 0.92,
recall ≥ 0.85) and the regression gate for every prompt/model change.

## Composition targets
| Category | Share | Why |
|---|---|---|
| `clean` | ~40% | single-speaker dictations, clear names/addresses — the happy path |
| `messy_multiparty` | ~40% | Fireflies output with crosstalk, mis-attributed speakers, garbled addresses/figures — where the risk lives |
| `low_signal` | ~20% | quick Q&A / clarifications (~60% of real calls) — teaches the eval that mostly-null extraction is CORRECT |

Source them from the client's Fireflies trial (real meetings, per proposal §7).
Redact anything the client asks; keep the character offsets stable after redaction.

## How to label
One JSON file per transcript in `goldset/`, shaped per `src/types.ts` (`GoldRecord`):
- Label a field ONLY if the transcript supports it. Extraction is best-effort
  enrichment — do not label what a human couldn't confidently pull either.
- `null` is a real label. For `low_signal` records most fields should be null.
- `next_actions`: label every concrete commitment ("send the OM", "call Tuesday").
  Vague sentiment ("we should catch up sometime") is NOT a next action.
- `opportunity_type`: one of the 13 taxonomy values, or null when the
  conversation doesn't establish one.
- Do not label source offsets — spans are structurally validated by the gate;
  labeling them doubles effort for little scoring value.

## Scoring semantics (so labelers know what counts)
- Wrong value = worse than missing value (counts FP + FN). When in doubt
  between two readings of a garbled name, label null and note it in `notes`.
- Emails compare case-insensitively; phones compare digits-only;
  names/addresses compare after punctuation/whitespace normalization.

## Runbook
```
# live eval (needs ANTHROPIC_API_KEY)
npm run eval -w @starnes/extraction-eval

# offline scoring of stored predictions (CI, harness development)
npm run eval:mock -w @starnes/extraction-eval
```
Exit code is the gate: nonzero blocks the prompt change.
