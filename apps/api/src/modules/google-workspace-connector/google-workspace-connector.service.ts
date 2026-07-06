import { Inject, Injectable } from "@nestjs/common";
import { HitlGatewayService } from "../hitl-gateway/hitl-gateway.service";

/**
 * google-workspace-connector (§9): the SINGLE egress/ingress for
 * Sheets (import/read/scoped-write), Calendar (event write), Gmail
 * (poll/draft/send). Holds the OAuth token store (vault refs), least-privilege
 * scopes, and the column-ownership map. NO UNGUARDED SEND/WRITE.
 *
 * Column-ownership contract (§9, decision log #7): write-back touches ONLY
 * managed columns (db_contact_id, last_contacted_at, cadence_status);
 * DB-wins on managed columns, last-write-wins (left alone) on free columns.
 *
 * TODO(C-block 3): OAuth flow, Sheets idempotent upsert keyed sheets_row_id,
 * Calendar events.insert on approval, Gmail poll + drafts.create.
 */
@Injectable()
export class GoogleWorkspaceConnectorService {
  /** Managed columns this connector owns on the client sheet. Never write outside this set. */
  static readonly MANAGED_COLUMNS = ["db_contact_id", "last_contacted_at", "cadence_status"] as const;

  constructor(@Inject(HitlGatewayService) private readonly hitl: HitlGatewayService) {}

  /** Every external send/write consumes a single-use dispatch token first. */
  async sendGmail(dispatchToken: string, payload: { to: string; subject: string; body: string }): Promise<void> {
    await this.hitl.consumeToken(dispatchToken, payload);
    // TODO(C18): CAN-SPAM enforcement (suppression list, address footer, unsubscribe) then gmail.send
    throw new Error("Not implemented until C-block 5 (by design: no send path before the gate)");
  }
}
