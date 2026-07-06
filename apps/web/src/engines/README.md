# Shared engines (the FE backbone, built once — §3.5)

| Engine | Responsibility | Consumers |
|--------|----------------|-----------|
| S1 Review/Queue shell | list + status chips + row/bulk actions + filter/sort + skeletons; config-driven columns/actions | transcript queue, HITL approval, agent errors, follow-ups, digest (8 surfaces) |
| S2 Review-and-correct form | field-level diff (LLM vs current), per-field accept/edit/reject, confidence indicators, submit-as-patch | extraction correction, edit-before-send, dedup merge, import mapping |
| S3 Dashboard widget-grid + chart wrapper | responsive grid, card shell (loading/empty/error), dynamic chart import + a11y fallbacks | master dashboard |
| S4 Wizard/stepper | linear/branching steps, per-step validation, persisted state | migration import, capture→correct |
| S5 Config-form | schema-driven scaffold, dirty tracking, save/cancel/reset | routing rules, role config, cadence rules (6 surfaces) |
| S6 Auth/RBAC view-gating HOC | session/role context, route + action gating (UX only — API authorizes independently) | every role-gated route |
| S7 Activity Timeline (round 2) | chronological date-grouped mixed feed (transcripts + manual activities), read-only mount | contacts, property, opportunities |

Built in Phase B (tasks B2–B4). CLS discipline: skeletons reserve dimensions so
rows never shift under a cursor mid-click — a correctness risk in the approval
queue, not polish. INP < 200ms on queue actions is the adoption-critical number.
