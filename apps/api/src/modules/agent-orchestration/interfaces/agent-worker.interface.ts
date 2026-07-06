import type { ZodType } from 'zod';
import type { Capability } from '@starnes/shared';

export interface ProvenanceRecord {
  source: string; // e.g. interaction:<uuid>
  span: { start: number; end: number } | null;
}

export interface AgentResult<TOutput = unknown> {
  output: TOutput;
  provenance: ProvenanceRecord[];
  /** Self-scored, 0–1; null when the capability has no meaningful confidence. */
  confidence: number | null;
  tokenUsage?: { input: number; output: number };
}

export interface AgentRunContext {
  runId: string;
  trigger: string; // cron | reactive:<event> | manual
  attempt: number;
}

/**
 * The AgentWorker contract (§9) — the interchangeability requirement.
 * Each worker declares a capability, an input schema (validated before run),
 * and run(ctx) returning a result with provenance + confidence.
 * Workers self-register at boot; the orchestrator resolves by capability.
 * Swapping the extraction model or replacing the routing worker requires
 * ZERO orchestrator change.
 *
 * Security invariant: workers have NO send/write tools. They only propose.
 * Every external effect goes through the hitl-gateway module.
 */
export interface AgentWorker<TInput = unknown, TOutput = unknown> {
  readonly capability: Capability;
  readonly workerId: string;
  readonly inputSchema: ZodType<TInput>;
  run(ctx: AgentRunContext, input: TInput): Promise<AgentResult<TOutput>>;
}

export const AGENT_WORKER = Symbol('AGENT_WORKER');
