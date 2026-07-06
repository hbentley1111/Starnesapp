import { Injectable } from '@nestjs/common';

/**
 * prioritization (§9): config-weighted scoring; noise suppression → batched
 * digest items. THE anti-"300 tasks a day" mechanism. Never-suppress-critical
 * rule enforced here. TODO(C20).
 */
@Injectable()
export class PrioritizationService {
  band(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
}
