import { Injectable } from '@nestjs/common';

/**
 * migration (§9, extended round 2): re-runnable Sheets CRM import
 * (idempotent on sheets_row_id, column mapping, import-error report,
 * dedup pass reusing the contacts entity-resolution engine) + full-database
 * export (round 2, pulled forward from Phase 3): on-demand serialize +
 * PII-scrub + portable CSV/JSON bundle. Export restricted to ops/admin role.
 * TODO(C23–C25).
 */
@Injectable()
export class MigrationService {}
