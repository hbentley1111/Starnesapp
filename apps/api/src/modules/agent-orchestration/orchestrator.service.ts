import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { AuditService } from '../../common/audit/audit.service';
import { WorkerRegistryService } from './worker-registry.service';
import type { Capability } from '@starnes/shared';
import type { AgentResult } from './interfaces/agent-worker.interface';

/**
 * Orchestrator (§9): cron + allow-listed reactive scheduling; per-run
 * lifecycle, error/retry/backoff, dead-letter. Scheduled-batch is the
 * default trigger model (decision log #5 — the anti-"300 tasks a day"
 * requirement); reactive triggers only where deal-criticality earns it.
 *
 * TODO(C-block): wire BullMQ repeatable jobs (cron windows) + allow-list
 * reactive events; concurrency caps 2–4 workers per §1.1.
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private static readonly MAX_ATTEMPTS = 3; // initial + 2 retries (1s, 4s backoff) per §1.7

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(WorkerRegistryService) private readonly registry: WorkerRegistryService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async dispatch<TOutput = unknown>(
    capability: Capability,
    input: unknown,
    trigger: string,
  ): Promise<AgentResult<TOutput>> {
    const worker = this.registry.resolve(capability);
    const parsed = worker.inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Input failed schema validation for ${capability}: ${parsed.error.message}`);
    }

    const { rows } = await this.pool.query(
      `INSERT INTO agent_run (capability, worker_id, trigger, status, attempts, started_at, input_ref)
       VALUES ($1, $2, $3, 'running', 1, now(), $4) RETURNING id`,
      [capability, worker.workerId, trigger, JSON.stringify({ preview: true })],
    );
    const runId: string = rows[0].id;

    try {
      const result = (await worker.run({ runId, trigger, attempt: 1 }, parsed.data)) as AgentResult<TOutput>;
      await this.pool.query(
        `UPDATE agent_run SET status = 'succeeded', finished_at = now(), token_usage = $2 WHERE id = $1`,
        [runId, result.tokenUsage ? JSON.stringify(result.tokenUsage) : null],
      );
      await this.audit.record({ actor: `worker:${worker.workerId}`, action: `run.${capability}`, entityType: 'agent_run', entityId: runId });
      return result;
    } catch (err) {
      // TODO(C-block): retry with backoff up to MAX_ATTEMPTS, then dead_letter + alert.
      this.logger.error(`run ${runId} failed`, err as Error);
      await this.pool.query(
        `UPDATE agent_run SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`,
        [runId, String(err)],
      );
      throw err;
    }
  }
}
