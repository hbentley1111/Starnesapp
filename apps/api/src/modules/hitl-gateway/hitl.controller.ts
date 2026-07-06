import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { AuditService } from '../../common/audit/audit.service';
import { HitlGatewayService } from './hitl-gateway.service';

/** Approval queue endpoints — decisions here are the ONLY path to external effects. */
@Controller('approvals')
export class HitlController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(HitlGatewayService) private readonly gateway: HitlGatewayService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async devActor(): Promise<string> {
    // TODO(B1): replace with the authenticated session user + RBAC check (founder/relations only).
    const { rows } = await this.pool.query(`SELECT id FROM app_user WHERE role = 'founder' LIMIT 1`);
    if (!rows.length) throw new NotFoundException('No founder user seeded');
    return rows[0].id;
  }

  @Get()
  async pending() {
    const { rows } = await this.pool.query(`
      SELECT d.id, d.channel, d.generated_body, d.edited_body, d.approval_state, c.full_name AS contact
      FROM outreach_draft d JOIN contact c ON c.id = d.contact_id
      WHERE d.approval_state = 'pending_approval'
      ORDER BY d.created_at`);
    return rows;
  }

  @Post(':draftId/approve')
  async approve(@Param('draftId') draftId: string, @Body() body: { editedBody?: string }) {
    const decidedBy = await this.devActor();
    const { rows } = await this.pool.query(`SELECT * FROM outreach_draft WHERE id = $1 AND approval_state = 'pending_approval'`, [draftId]);
    if (!rows.length) throw new NotFoundException('Draft not pending');
    const draft = rows[0];
    const finalBody: string = body?.editedBody ?? draft.edited_body ?? draft.generated_body;

    const target = { kind: draft.channel, contactId: draft.contact_id, body: finalBody };
    const { approvalId } = await this.gateway.approve({ draftId, target, decidedBy });
    await this.pool.query(`UPDATE outreach_draft SET approval_state = 'approved', edited_body = $2 WHERE id = $1`, [draftId, finalBody]);
    // Dispatch itself (connector consuming the single-use token) is C-block 5; the decision + token are real now.
    return { approvalId, state: 'approved' };
  }

  @Post(':draftId/reject')
  async reject(@Param('draftId') draftId: string) {
    const decidedBy = await this.devActor();
    const res = await this.pool.query(`UPDATE outreach_draft SET approval_state = 'rejected' WHERE id = $1 AND approval_state = 'pending_approval'`, [draftId]);
    if (!res.rowCount) throw new NotFoundException('Draft not pending');
    await this.audit.record({ actor: `user:${decidedBy}`, action: 'hitl.reject', entityType: 'outreach_draft', entityId: draftId });
    return { state: 'rejected' };
  }
}
