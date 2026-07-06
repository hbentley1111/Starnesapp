-- ============================================================================
-- Starnes backbone — migration 0001 (schema v1, architecture round 2, 2026-07-03)
-- PostgreSQL 16. Source of truth: SOLUTION_ARCHITECTURE §9 Database Schema.
--
-- Conventions:
--  * Every business entity carries: id uuid, created_at, updated_at, version,
--    superseded_by, is_current  →  APPEND-ONLY SUPERSESSION. Updates insert a
--    new version row and flip is_current; nothing is destructively overwritten.
--  * pgvector columns are declared nullable/UNINDEXED — reserved for Phase 2/3.
--  * audit_log is append-only: triggers block UPDATE/DELETE at the DB level.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS vector;     -- reserved (Phase 2/3), unindexed in MVP

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('founder','commercial','residential','relations','ops');

CREATE TYPE opportunity_type AS ENUM (
  'listing','buyer_rep','tenant_rep','valuation','acquisition','disposition',
  'capital_opportunity','investor_opportunity','owner_intel','tenant_requirement',
  'landlord_assignment','referral','follow_up_project'
);
-- Deal-track types (keep the 4-stage pipeline); all other types use status.
-- Stage values kept as TEXT + CHECK (client-configurable per CCQ-013).

CREATE TYPE need_type AS ENUM ('buyer','tenant','investor','owner','landlord');
CREATE TYPE interaction_source AS ENUM ('fireflies','pwa','manual');
CREATE TYPE activity_type AS ENUM (
  'transcript','call','lunch','meeting','site_visit','text','email','tour',
  'valuation','proposal','note'
);
CREATE TYPE extracted_status AS ENUM ('pending_review','needs_review','accepted','rejected','needs_attention');
CREATE TYPE approval_state AS ENUM ('draft','pending_approval','approved','rejected','dispatched');
CREATE TYPE agent_run_status AS ENUM ('queued','running','succeeded','failed','dead_letter');
CREATE TYPE lead_status AS ENUM ('new','routed','contacted','converted','discarded');

-- ---------------------------------------------------------------------------
-- Helpers: updated_at touch trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub    text UNIQUE NOT NULL,
  email         text UNIQUE NOT NULL,
  name          text NOT NULL,
  role          user_role NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_app_user_touch BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE session (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES app_user(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  sliding_expires_at  timestamptz NOT NULL,        -- ~8h sliding
  absolute_expires_at timestamptz NOT NULL         -- 24h absolute cap
);
CREATE INDEX idx_session_user ON session(user_id);

-- ---------------------------------------------------------------------------
-- Core relationship spine: company / contact / property
-- ---------------------------------------------------------------------------
CREATE TABLE company (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  normalized_name  text NOT NULL,                  -- dedup blocking key
  domain           text,
  type             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          integer NOT NULL DEFAULT 1,
  superseded_by    uuid REFERENCES company(id),
  is_current       boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_company_norm ON company(normalized_name) WHERE is_current;
CREATE TRIGGER trg_company_touch BEFORE UPDATE ON company FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE contact (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name          text NOT NULL,
  normalized_name    text NOT NULL,                -- dedup blocking key
  emails             text[] NOT NULL DEFAULT '{}',
  phones             text[] NOT NULL DEFAULT '{}',
  company_id         uuid REFERENCES company(id),
  owner_user_id      uuid REFERENCES app_user(id),
  last_contacted_at  timestamptz,                  -- managed column, written back to Sheets
  cadence_status     text,                         -- managed column, written back to Sheets
  embedding          vector(1536),                 -- RESERVED Phase 2/3, unindexed

  -- investor_profile (nullable field group, round 2 — pure data capture, no portal/syndication in MVP)
  accredited_status          text,
  investment_range_min       numeric,
  investment_range_max       numeric,
  preferred_asset_types      text[],
  preferred_geography        text,
  active_passive_preference  text,
  risk_tolerance             text,
  liquidity_preference       text,
  last_conversation_at       timestamptz,
  next_follow_up_at          timestamptz,
  relationship_quality       text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  superseded_by  uuid REFERENCES contact(id),
  is_current     boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_contact_norm ON contact(normalized_name) WHERE is_current;
CREATE INDEX idx_contact_company ON contact(company_id) WHERE is_current;
CREATE INDEX idx_contact_owner ON contact(owner_user_id) WHERE is_current;
CREATE TRIGGER trg_contact_touch BEFORE UPDATE ON contact FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE property (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address             text NOT NULL,
  normalized_address  text NOT NULL,
  asset_class         text,
  submarket           text,
  size_sqft           numeric,
  owner_company_id    uuid REFERENCES company(id),
  embedding           vector(1536),                -- RESERVED Phase 2/3, unindexed
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  superseded_by  uuid REFERENCES property(id),
  is_current     boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_property_norm ON property(normalized_address) WHERE is_current;
CREATE TRIGGER trg_property_touch BEFORE UPDATE ON property FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- n-n contact<->property association (relationship spine)
CREATE TABLE contact_property (
  contact_id  uuid NOT NULL REFERENCES contact(id),
  property_id uuid NOT NULL REFERENCES property(id),
  relation    text,
  PRIMARY KEY (contact_id, property_id)
);

-- ---------------------------------------------------------------------------
-- Opportunity (renamed/broadened from deal, round 2) + participants
-- ---------------------------------------------------------------------------
CREATE TABLE opportunity (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type  opportunity_type NOT NULL,
  property_id       uuid REFERENCES property(id),  -- NULLABLE: "investor has $250k to place"
  stage             text,                          -- deal-track types only
  status            text,                          -- non-deal-track types only (open/active/closed)
  value             numeric,
  broker_user_id    uuid REFERENCES app_user(id),
  title             text,
  notes             text,
  voided_at         timestamptz,                   -- soft-delete/void keeps audit trail
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  superseded_by  uuid REFERENCES opportunity(id),
  is_current     boolean NOT NULL DEFAULT true,

  -- Deal-track types carry stage (4-stage pipeline, configurable);
  -- non-deal-track types carry the lighter status. Mutually exclusive.
  CONSTRAINT chk_opportunity_track CHECK (
    CASE WHEN opportunity_type IN ('listing','buyer_rep','tenant_rep','acquisition','disposition')
         THEN stage IS NOT NULL AND status IS NULL
         ELSE status IS NOT NULL AND stage IS NULL
    END
  ),
  CONSTRAINT chk_stage_values  CHECK (stage  IS NULL OR stage  IN ('prospecting','negotiating','loi','due_diligence')),
  CONSTRAINT chk_status_values CHECK (status IS NULL OR status IN ('open','active','closed'))
);
CREATE INDEX idx_opportunity_type ON opportunity(opportunity_type) WHERE is_current;
CREATE INDEX idx_opportunity_property ON opportunity(property_id) WHERE is_current;
CREATE TRIGGER trg_opportunity_touch BEFORE UPDATE ON opportunity FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE opportunity_contact (
  opportunity_id uuid NOT NULL REFERENCES opportunity(id),
  contact_id     uuid NOT NULL REFERENCES contact(id),
  role           text NOT NULL,   -- buyer/seller/tenant/investor/owner/landlord (varies by type)
  PRIMARY KEY (opportunity_id, contact_id, role)
);

-- ---------------------------------------------------------------------------
-- need (NEW round 2) — structured, manually entered, NOT LLM-derived.
-- The seed for the Phase-3 Starnes Intelligence matching engine.
-- ---------------------------------------------------------------------------
CREATE TABLE need (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_type              need_type NOT NULL,
  asset_type             text,
  geography              text,
  size_min               numeric,
  size_max               numeric,
  price_min              numeric,
  price_max              numeric,
  lease_sale_preference  text CHECK (lease_sale_preference IN ('lease','sale','either')),
  timing                 text,
  motivation_level       text,
  priority               text CHECK (priority IN ('high','medium','low')),
  contact_id             uuid REFERENCES contact(id),
  company_id             uuid REFERENCES company(id),
  property_id            uuid REFERENCES property(id),
  notes                  text NOT NULL DEFAULT '',
  status                 text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','closed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        integer NOT NULL DEFAULT 1,
  superseded_by  uuid REFERENCES need(id),
  is_current     boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_need_contact ON need(contact_id) WHERE is_current;
CREATE TRIGGER trg_need_touch BEFORE UPDATE ON need FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- interaction (transcript / activity) — backs the S7 Activity Timeline
-- ---------------------------------------------------------------------------
CREATE TABLE interaction (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          interaction_source NOT NULL,
  activity_type   activity_type NOT NULL DEFAULT 'transcript',  -- round 2
  external_id     text,                        -- idempotency key, unique per source
  content_hash    text,                        -- SHA-256 of normalized text (dedupe re-uploads/replays)
  raw_transcript  text,
  occurred_at     timestamptz NOT NULL,
  contact_id      uuid REFERENCES contact(id),
  property_id     uuid REFERENCES property(id),
  opportunity_id  uuid REFERENCES opportunity(id),   -- round 2
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_interaction_source_ext ON interaction(source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX uq_interaction_hash ON interaction(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_interaction_contact_time ON interaction(contact_id, occurred_at DESC);
CREATE INDEX idx_interaction_property_time ON interaction(property_id, occurred_at DESC);
CREATE INDEX idx_interaction_opportunity_time ON interaction(opportunity_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- extracted_entity — append-only; review writes a new accepted version
-- ---------------------------------------------------------------------------
CREATE TABLE extracted_entity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id  uuid NOT NULL REFERENCES interaction(id),
  target_type     text NOT NULL,               -- contact/property/intent/opportunity_type/...
  field_key       text NOT NULL,
  field_value     jsonb NOT NULL,
  provenance      jsonb NOT NULL,              -- { source, span: {start,end} } — no span = rejected upstream
  confidence      numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status          extracted_status NOT NULL DEFAULT 'pending_review',
  prompt_version  text NOT NULL,               -- non-negotiable provenance contract
  model_id        text NOT NULL,
  superseded_by   uuid REFERENCES extracted_entity(id),
  is_current      boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_extracted_interaction ON extracted_entity(interaction_id) WHERE is_current;
CREATE INDEX idx_extracted_review ON extracted_entity(status) WHERE status IN ('pending_review','needs_review');

CREATE TABLE intent_signal (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                 uuid REFERENCES property(id),
  contact_id                  uuid NOT NULL REFERENCES contact(id),
  intent_type                 text NOT NULL,
  strength                    numeric,
  derived_from_interaction_id uuid REFERENCES interaction(id),
  created_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intent_contact ON intent_signal(contact_id);
CREATE INDEX idx_intent_property ON intent_signal(property_id);

-- ---------------------------------------------------------------------------
-- Cadence
-- ---------------------------------------------------------------------------
CREATE TABLE cadence_schedule (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     uuid NOT NULL UNIQUE REFERENCES contact(id),
  tier           integer NOT NULL CHECK (tier IN (30,60,90)),
  next_due_at    timestamptz,
  last_touch_at  timestamptz,
  state          text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_cadence_touch BEFORE UPDATE ON cadence_schedule FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE follow_up (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id           uuid NOT NULL REFERENCES contact(id),
  cadence_schedule_id  uuid REFERENCES cadence_schedule(id),
  due_at               timestamptz NOT NULL,
  completed_at         timestamptz,
  status               text NOT NULL DEFAULT 'due' CHECK (status IN ('due','done','overdue','snoozed')),
  calendar_event_id    text,                       -- Google Calendar eventId (written on approval)
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_follow_up_due ON follow_up(status, due_at);

-- ---------------------------------------------------------------------------
-- HITL gate: outreach_draft + approval_decision (the security gate)
-- ---------------------------------------------------------------------------
CREATE TABLE agent_run (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability   text NOT NULL,
  worker_id    text NOT NULL,
  trigger      text NOT NULL,                     -- cron | reactive:<event> | manual
  status       agent_run_status NOT NULL DEFAULT 'queued',
  attempts     integer NOT NULL DEFAULT 0,
  error        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  input_ref    jsonb,
  output_ref   jsonb,
  token_usage  jsonb,                             -- per-run cost observability
  prompt_version text,
  model_id     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_run_status ON agent_run(status, created_at DESC);

CREATE TABLE outreach_draft (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid NOT NULL REFERENCES contact(id),
  channel         text NOT NULL DEFAULT 'gmail',
  generated_body  text NOT NULL,
  edited_body     text,
  agent_run_id    uuid REFERENCES agent_run(id),
  approval_state  approval_state NOT NULL DEFAULT 'pending_approval',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_draft_state ON outreach_draft(approval_state, created_at);
CREATE TRIGGER trg_draft_touch BEFORE UPDATE ON outreach_draft FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE approval_decision (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id           uuid REFERENCES outreach_draft(id),
  target             jsonb NOT NULL,              -- generic dispatch target (gmail send / calendar write / sheets write)
  action             text NOT NULL CHECK (action IN ('approve','reject')),
  decided_by         uuid NOT NULL REFERENCES app_user(id),
  decided_at         timestamptz NOT NULL DEFAULT now(),
  payload_hash       text NOT NULL,               -- token is bound to the EXACT payload
  dispatch_token     text UNIQUE,                 -- signed, SINGLE-USE; connector consumes it
  token_consumed_at  timestamptz                  -- set exactly once by the send/write service
);
CREATE INDEX idx_approval_draft ON approval_decision(draft_id);

-- ---------------------------------------------------------------------------
-- Lead intake & routing
-- ---------------------------------------------------------------------------
CREATE TABLE routing_rule (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority          integer NOT NULL,
  predicate         jsonb NOT NULL,
  assignee_user_id  uuid NOT NULL REFERENCES app_user(id),
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lead (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  contact_info       jsonb NOT NULL DEFAULT '{}',
  source             text NOT NULL DEFAULT 'website',
  status             lead_status NOT NULL DEFAULT 'new',
  assigned_user_id   uuid REFERENCES app_user(id),
  routing_rule_id    uuid REFERENCES routing_rule(id),
  linked_contact_id  uuid REFERENCES contact(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_status ON lead(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Prioritization + digest
-- ---------------------------------------------------------------------------
CREATE TABLE priority_score (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,                     -- lead | follow_up | task
  subject_id   uuid NOT NULL,
  score        numeric NOT NULL,
  band         text NOT NULL CHECK (band IN ('high','medium','low')),
  computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);

CREATE TABLE digest (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembled_at  timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE digest_recipient (
  digest_id uuid NOT NULL REFERENCES digest(id),
  user_id   uuid NOT NULL REFERENCES app_user(id),
  PRIMARY KEY (digest_id, user_id)
);
CREATE TABLE digest_item (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id    uuid REFERENCES digest(id),        -- null until assembled
  subject_type text NOT NULL,
  subject_id   uuid NOT NULL,
  rank         integer,
  suppressed   boolean NOT NULL DEFAULT false,    -- noise suppression (never-suppress-critical enforced in code)
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Integration state
-- ---------------------------------------------------------------------------
CREATE TABLE google_token (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES app_user(id),
  scopes           text[] NOT NULL DEFAULT '{}',
  vault_secret_ref text NOT NULL,                 -- refresh token lives in the VAULT, never in this DB
  connection_state text NOT NULL DEFAULT 'connected' CHECK (connection_state IN ('connected','broken','revoked')),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sheets_sync_cursor (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id    text NOT NULL UNIQUE,
  cursor      jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ingestion_cursor (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL UNIQUE,               -- fireflies-reconciliation | gmail-poll | ...
  cursor      jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE worker_registry (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id      text NOT NULL UNIQUE,
  capability     text NOT NULL,
  registered_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Migration / export / merge bookkeeping
-- ---------------------------------------------------------------------------
CREATE TABLE migration_batch (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL DEFAULT 'sheets',
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  stats        jsonb NOT NULL DEFAULT '{}',
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE TABLE import_error (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_batch_id uuid NOT NULL REFERENCES migration_batch(id),
  row_ref            text,
  error              text NOT NULL,
  raw_row            jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE entity_merge_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    text NOT NULL,
  winner_id      uuid NOT NULL,
  loser_id       uuid NOT NULL,
  survivorship   jsonb NOT NULL,                  -- field-level record → merges are REVERSIBLE
  merged_by      uuid REFERENCES app_user(id),
  merged_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE export_job (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- round 2: full-DB export pulled forward to MVP
  requested_by  uuid NOT NULL REFERENCES app_user(id),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  bundle_ref    text,
  pii_scrubbed  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- audit_log — append-only, write-only from the application
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        text NOT NULL,                     -- user:<uuid> | worker:<id> | system
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only (no UPDATE/DELETE)'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
-- In cloud envs, additionally REVOKE UPDATE, DELETE ON audit_log FROM the app role
-- (the app role is provisioned by Terraform; a superuser can bypass triggers).
