import { Injectable } from '@nestjs/common';

/**
 * notifications/digest (§9): assembles + delivers the batched email digest —
 * digest_item queue in → digest payload → (HITL) → Gmail out.
 * Email digest is the MVP push channel (in-app realtime badge deferred V1.1).
 * Edge: empty-digest suppression, frequency config. TODO(C21).
 */
@Injectable()
export class NotificationsService {}
