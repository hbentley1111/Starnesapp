import { Injectable } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Single-use dispatch tokens (§8, decision log #2): every external effect
 * requires a valid single-use approval token BOUND TO THE EXACT PAYLOAD HASH.
 * The send/write service rejects any request lacking one. No agent process
 * holds send/write credentials. Enforced in the backend service layer, not the UI.
 */
@Injectable()
export class DispatchTokenService {
  private key(): Buffer {
    const key = process.env.HITL_TOKEN_SIGNING_KEY;
    if (!key) throw new Error('HITL_TOKEN_SIGNING_KEY is not configured');
    return Buffer.from(key, 'utf8');
  }

  hashPayload(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  issue(approvalId: string, payloadHash: string): string {
    const body = `${approvalId}.${payloadHash}`;
    const sig = createHmac('sha256', this.key()).update(body).digest('hex');
    return `${body}.${sig}`;
  }

  /** Verifies signature AND payload binding. Single-use consumption is enforced in HitlGatewayService against token_consumed_at. */
  verify(token: string, expectedPayloadHash: string): { approvalId: string } {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed dispatch token');
    const [approvalId, payloadHash, sig] = parts;
    const expectedSig = createHmac('sha256', this.key()).update(`${approvalId}.${payloadHash}`).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid dispatch token signature');
    if (payloadHash !== expectedPayloadHash) throw new Error('Dispatch token does not match payload');
    return { approvalId };
  }
}
