# Starnes Real Estate Advisors — Phase 1 MVP

Modular-monolith scaffold generated from SOLUTION_ARCHITECTURE (round 2, 2026-07-03).
Covers build-plan tasks **A1, A3–A6** (+ HITL token gate pulled forward as the security spine).

## Layout
```
packages/extraction-eval  Gold-set eval harness + extraction@v1 prompt (A7 / Spike S-1) — see LABELING_GUIDE.md
packages/shared      Entity vocabulary, capability keys, Zod contracts (extraction, manual activity, need, lead)
apps/api             NestJS 11 modular monolith — 12 enforced module seams
  src/database       pg pool + transaction-wrapped SQL migration runner
  src/database/migrations/0001_init.sql   Full backbone schema (§9, round 2)
  src/common/audit   Append-only audit service (DB triggers block UPDATE/DELETE)
  src/modules/*      auth-rbac · google-workspace-connector · voice-ingestion · extraction ·
                     contacts (ER + opportunity pipeline) · cadence · lead-intake · prioritization ·
                     hitl-gateway · agent-orchestration · notifications · migration
apps/web             Next.js 15 thin RSC shell; src/engines documents S1–S7 (built Phase B)
```

## Run locally
```
docker compose up -d                    # pgvector/pg16 + redis 7
npm install
npm run db:migrate -w @starnes/api
npm run db:seed -w @starnes/api         # dev data (contacts, opportunities, pending approvals)
npm run start:dev -w @starnes/api       # API on :3001 (needs DATABASE_URL + HITL_TOKEN_SIGNING_KEY, see .env.example)
npm run dev -w @starnes/web             # UI on :3000 (dark theme, wired to the API via TanStack Query)
```
The approvals screen is live end-to-end: approving a draft creates an
approval_decision with a signed single-use dispatch token and an audit entry;
correcting an extraction writes a new supersession version.

## Invariants encoded in this scaffold
1. **Append-only supersession** — business entities carry version/superseded_by/is_current; see ContactsService.newVersion for the canonical write.
2. **HITL choke point** — DispatchTokenService issues single-use tokens bound to a payload hash; GoogleWorkspaceConnectorService.sendGmail consumes one before any external effect and is deliberately unimplemented until C-block 5.
3. **AgentWorker interchangeability** — workers self-register by capability; orchestrator dispatches by key, never concrete class.
4. **Validation gate** — ExtractionService.validate implements gate steps 1–3 (schema re-validation, confidence < 0.75 → needs_review, provenance span enforcement).
5. **Module seams** — eslint no-restricted-imports blocks cross-module deep imports; cross-module calls go through exported services via DI.

## Deliberately not here yet
Live Google/Fireflies/Anthropic wiring (C-blocks 1–3), BullMQ queue topology (B7),
S1–S7 engine implementations + design tokens (B2–B4, A11), Terraform (A2).
