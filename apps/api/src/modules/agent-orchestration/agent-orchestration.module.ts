import { Module } from '@nestjs/common';
import { WorkerRegistryService } from './worker-registry.service';
import { OrchestratorService } from './orchestrator.service';

/**
 * Feature modules contribute workers by providing against the AGENT_WORKER
 * multi-token, e.g.:
 *   { provide: AGENT_WORKER, useClass: ExtractionWorker, multi-style via array }
 * (Nest has no built-in multi-provider; the pattern here is an array factory —
 * see extraction.module.ts for the wiring example added in C-block 2.)
 */
@Module({
  providers: [WorkerRegistryService, OrchestratorService],
  exports: [WorkerRegistryService, OrchestratorService],
})
export class AgentOrchestrationModule {}
