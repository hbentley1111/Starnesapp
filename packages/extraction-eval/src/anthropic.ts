import { ExtractionOutputSchema, type ExtractionOutput } from '@starnes/shared';
import { buildExtractionPrompt, FALLBACK_MODEL, PRIMARY_MODEL, PROMPT_VERSION } from './prompt';

/**
 * Minimal Anthropic Messages client for the eval harness.
 * Failure handling mirrors §4.6: 2 retries on transient failures (1s, 4s
 * backoff); on schema-invalid output one re-prompt with the validation error,
 * then one attempt on the fallback model; nothing partial is accepted.
 * Server-side key only — never client-exposed.
 */
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_OUTPUT_TOKENS = 4000; // token cap per call (§10 cost control)

interface CallResult {
  parsed: ExtractionOutput;
  model_id: string;
  prompt_version: string;
  usage: { input: number; output: number };
}

async function callOnce(model: string, system: string, user: string): Promise<{ text: string; usage: { input: number; output: number } }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set — use --predictions <file> for offline scoring');

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 2) throw new Error(`Anthropic API ${res.status} after ${attempt + 1} attempts`);
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 4000));
      continue;
    }
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { content: Array<{ type: string; text?: string }>; usage: { input_tokens: number; output_tokens: number } };
    const text = body.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    return { text, usage: { input: body.usage.input_tokens, output: body.usage.output_tokens } };
  }
}

function tryParse(text: string): { ok: true; value: ExtractionOutput } | { ok: false; error: string } {
  try {
    const json = JSON.parse(text.trim());
    const result = ExtractionOutputSchema.safeParse(json);
    return result.success ? { ok: true, value: result.data } : { ok: false, error: result.error.message };
  } catch (err) {
    return { ok: false, error: `Not valid JSON: ${String(err)}` };
  }
}

export async function extractViaApi(transcript: string): Promise<CallResult> {
  const { system, user } = buildExtractionPrompt(transcript);

  // primary attempt
  const first = await callOnce(PRIMARY_MODEL, system, user);
  let parsed = tryParse(first.text);
  if (parsed.ok) return { parsed: parsed.value, model_id: PRIMARY_MODEL, prompt_version: PROMPT_VERSION, usage: first.usage };

  // one re-prompt with the validation error (≤ 1 round)
  const reprompt = await callOnce(
    PRIMARY_MODEL,
    system,
    `${user}\n\nYour previous output failed validation:\n${parsed.error}\nReturn ONLY corrected JSON matching the schema.`,
  );
  parsed = tryParse(reprompt.text);
  if (parsed.ok) return { parsed: parsed.value, model_id: PRIMARY_MODEL, prompt_version: PROMPT_VERSION, usage: reprompt.usage };

  // escalate to fallback model for one attempt
  const fallback = await callOnce(FALLBACK_MODEL, system, user);
  parsed = tryParse(fallback.text);
  if (parsed.ok) return { parsed: parsed.value, model_id: FALLBACK_MODEL, prompt_version: PROMPT_VERSION, usage: fallback.usage };

  throw new Error(`Extraction failed schema validation on both models: ${parsed.error}`);
}
