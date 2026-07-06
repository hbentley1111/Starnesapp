/**
 * Canonical entity vocabulary — mirrors SOLUTION_ARCHITECTURE §9 Database Schema.
 * These are the FE/BE contract types; the SQL in apps/api/src/database/migrations
 * is the source of truth for persistence shape.
 */

export const USER_ROLES = ['founder', 'commercial', 'residential', 'relations', 'ops'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** 13-type opportunity taxonomy (round 2 broadening of "deal"). */
export const OPPORTUNITY_TYPES = [
  'listing',
  'buyer_rep',
  'tenant_rep',
  'valuation',
  'acquisition',
  'disposition',
  'capital_opportunity',
  'investor_opportunity',
  'owner_intel',
  'tenant_requirement',
  'landlord_assignment',
  'referral',
  'follow_up_project',
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

/** Deal-track types keep the 4-stage pipeline; all others use the lighter status. */
export const DEAL_TRACK_TYPES: readonly OpportunityType[] = [
  'listing',
  'buyer_rep',
  'tenant_rep',
  'acquisition',
  'disposition',
];
export const OPPORTUNITY_STAGES = ['prospecting', 'negotiating', 'loi', 'due_diligence'] as const; // configurable (CCQ-013)
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export const OPPORTUNITY_STATUSES = ['open', 'active', 'closed'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const NEED_TYPES = ['buyer', 'tenant', 'investor', 'owner', 'landlord'] as const;
export type NeedType = (typeof NEED_TYPES)[number];

export const INTERACTION_SOURCES = ['fireflies', 'pwa', 'manual'] as const;
export type InteractionSource = (typeof INTERACTION_SOURCES)[number];

/** Round-2 activity_type — backs the S7 Activity Timeline. Fireflies/PWA rows default to 'transcript'. */
export const ACTIVITY_TYPES = [
  'transcript',
  'call',
  'lunch',
  'meeting',
  'site_visit',
  'text',
  'email',
  'tour',
  'valuation',
  'proposal',
  'note',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const CADENCE_TIERS = [30, 60, 90] as const;
export type CadenceTier = (typeof CADENCE_TIERS)[number];

export const APPROVAL_STATES = ['draft', 'pending_approval', 'approved', 'rejected', 'dispatched'] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const AGENT_RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'dead_letter'] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];
