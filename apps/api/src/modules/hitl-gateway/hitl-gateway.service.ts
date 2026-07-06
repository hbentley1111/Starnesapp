import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { AuditService } from '../../common/audit/audit.service';
import { DispatchTokenService } from './dispatch-token.service';

/**
 * hitl-gateway — THE single external-write choke point (§2.2, §8).
 * Approval queue · edit-before-send · release/dispatch gate.
 *
 * TODO(C-block 5):
 *  - approval queue endpoints (S1-backed UI)
 *  - CAN-SPAM enforcement at dispatch (suppression check, physical-address
 *    footer, valid headers, working unsubscribe — server-side, unconditional)
 *  - connector dispatch (gmail send / calendar write) consuming the token
 */
@Injectable()
export class HitlGatewayService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DispatchTokenService) private readonly tokens: DispatchTokenService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Records an approval decision and issues the single-use dispatch token. */
  async approve(params: { draftId: string | null; target: unknown; decidedBy: string }): Promise<{ approvalId: string; dispatchToken: string }> {
    const payloadHash = this.tokens.hashPayload(params.target);
    const { rows } = await this.pool.query(
      `INSERT INTO approval_decision (draft_id, target, action, decided_by, payload_hash)
       VALUES ($1, $2, 'approve', $3, $4) RETURNING id`,
      [params.draftId, JSON.stringify(params.target), params.decidedBy, payloadHash],
    );
    const approvalId: string = rows[0].id;
    const dispatchToken = this.tokens.issue(approvalId, payloadHash);
    await this.pool.query(`UPDATE approval_decision SET dispatch_token = $2 WHERE id = $1`, [approvalId, dispatchToken]);
    await this.audit.record({
      actor: `user:${params.decidedBy}`,
      action: 'hitl.approve',
      entityType: 'approval_decision',
      entityId: approvalId,
      after: { payloadHash },
    });
    return { approvalId, dispatchToken };
  }

  /**
   * Consumes a token exactly once (row-level lock on token_consumed_at).
   * Connectors MUST call this before any external send/write.
   */
  async consumeToken(token: string, payload: unknown): Promise<{ approvalId: string }> {
    const payloadHash = this.tokens.hashPayload(payload);
    const { approvalId } = this.tokens.verify(token, payloadHash);
    const res = await this.pool.query(
      `UPDATE approval_decision
         SET token_consumed_at = now()
       WHERE id = $1 AND payload_hash = $2 AND token_consumed_at IS NULL`,
      [approvalId, payloadHash],
    );
    if (res.rowCount !== 1) throw new Error('Dispatch token already consumed or unknown');
    await this.audit.record({ actor: 'system', action: 'hitl.dispatch', entityType: 'approval_decision', entityId: approvalId });
    return { approvalId };
  }
}
