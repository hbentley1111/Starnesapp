import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { AGENT_WORKER, AgentWorker } from './interfaces/agent-worker.interface';
import type { Capability } from '@starnes/shared';

/**
 * Worker registry: workers self-register at boot (multi-provider AGENT_WORKER
 * token); the orchestrator dispatches by capability key, never by concrete class.
 */
@Injectable()
export class WorkerRegistryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerRegistryService.name);
  private readonly byCapability = new Map<Capability, AgentWorker>();

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Optional() @Inject(AGENT_WORKER) private readonly workers: AgentWorker[] = [],
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const worker of this.workers ?? []) {
      this.byCapability.set(worker.capability, worker);
      await this.pool.query(
        `INSERT INTO worker_registry (worker_id, capability)
         VALUES ($1, $2)
         ON CONFLICT (worker_id) DO UPDATE SET capability = EXCLUDED.capability, last_seen_at = now()`,
        [worker.workerId, worker.capability],
      );
      this.logger.log(`registered worker ${worker.workerId} → ${worker.capability}`);
    }
  }

  resolve(capability: Capability): AgentWorker {
    const worker = this.byCapability.get(capability);
    if (!worker) throw new Error(`No worker registered for capability "${capability}"`);
    return worker;
  }
}
