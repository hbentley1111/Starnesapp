import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

/**
 * Read endpoints for the Phase-B surfaces. Auth guards land with B1 (Google
 * SSO); until then this is dev-open behind the CORS allowlist. The dashboard
 * summary lives here for now — it graduates to its own read-model if it grows.
 */
@Controller()
export class ReadController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('contacts')
  async contacts() {
    const { rows } = await this.pool.query(`
      SELECT c.id, c.full_name, co.name AS company, c.last_contacted_at,
             cs.tier, cs.next_due_at,
             CASE WHEN cs.next_due_at < now() THEN 'overdue' ELSE 'current' END AS status
      FROM contact c
      LEFT JOIN company co ON co.id = c.company_id
      LEFT JOIN cadence_schedule cs ON cs.contact_id = c.id
      WHERE c.is_current
      ORDER BY c.full_name`);
    return rows;
  }

  @Get('opportunities')
  async opportunities() {
    const { rows } = await this.pool.query(`
      SELECT o.id, o.title, o.opportunity_type, o.stage, o.status, o.value,
             (SELECT c.full_name FROM opportunity_contact oc JOIN contact c ON c.id = oc.contact_id
               WHERE oc.opportunity_id = o.id LIMIT 1) AS contact
      FROM opportunity o
      WHERE o.is_current AND o.voided_at IS NULL
      ORDER BY o.created_at`);
    return rows;
  }

  @Get('dashboard/summary')
  async summary() {
    const [{ rows: pipeline }, { rows: fu }, { rows: leads }, { rows: stages }] = await Promise.all([
      this.pool.query(`SELECT COALESCE(SUM(value),0) AS total, COUNT(*) AS n FROM opportunity WHERE is_current AND stage IS NOT NULL AND voided_at IS NULL`),
      this.pool.query(`SELECT COUNT(*) FILTER (WHERE status IN ('due','overdue')) AS due, COUNT(*) FILTER (WHERE status='overdue') AS overdue FROM follow_up`),
      this.pool.query(`SELECT COUNT(*) AS n FROM lead WHERE created_at > now() - interval '7 days'`),
      this.pool.query(`SELECT stage, COALESCE(SUM(value),0) AS total FROM opportunity WHERE is_current AND stage IS NOT NULL AND voided_at IS NULL GROUP BY stage`),
    ]);
    return {
      pipelineValue: Number(pipeline[0].total),
      dealTrackCount: Number(pipeline[0].n),
      followUpsDue: Number(fu[0].due),
      followUpsOverdue: Number(fu[0].overdue),
      newLeads: Number(leads[0].n),
      pipelineByStage: stages.map((s) => ({ stage: s.stage, total: Number(s.total) })),
    };
  }

  @Get('dashboard/priority-actions')
  async priorityActions() {
    // Real "today" queue: overdue/due follow-ups joined to their contact + opportunity context,
    // ranked overdue-first. This is the honest version of "Today's Priority Actions".
    const { rows } = await this.pool.query(`
      SELECT f.id, f.status, f.due_at,
             c.full_name AS contact,
             co.name AS company,
             (SELECT o.title FROM opportunity_contact oc JOIN opportunity o ON o.id = oc.opportunity_id
               WHERE oc.contact_id = c.id AND o.is_current AND o.voided_at IS NULL
               ORDER BY o.value DESC NULLS LAST LIMIT 1) AS opportunity,
             GREATEST(0, EXTRACT(DAY FROM now() - f.due_at)::int) AS days_overdue
      FROM follow_up f
      JOIN contact c ON c.id = f.contact_id
      LEFT JOIN company co ON co.id = c.company_id
      WHERE f.status IN ('due','overdue')
      ORDER BY (f.status = 'overdue') DESC, f.due_at ASC
      LIMIT 8`);
    return rows.map((r) => ({
      id: r.id,
      contact: r.contact,
      company: r.company,
      opportunity: r.opportunity,
      status: r.status,
      daysOverdue: Number(r.days_overdue),
      // Suggested channel is a light heuristic; the real cadence engine sets this in C-block 4.
      action: Number(r.days_overdue) > 14 ? 'Call' : 'Email',
    }));
  }

  @Get('dashboard/pipeline')
  async pipelineTable() {
    // Active deal-track opportunities as a table (property, stage, value, age).
    const { rows } = await this.pool.query(`
      SELECT o.id, o.title, o.opportunity_type, o.stage, o.value,
             p.address, p.asset_class, p.submarket,
             EXTRACT(DAY FROM now() - o.created_at)::int AS age_days,
             (SELECT c.full_name FROM opportunity_contact oc JOIN contact c ON c.id = oc.contact_id
               WHERE oc.opportunity_id = o.id LIMIT 1) AS contact
      FROM opportunity o
      LEFT JOIN property p ON p.id = o.property_id
      WHERE o.is_current AND o.voided_at IS NULL AND o.stage IS NOT NULL
      ORDER BY o.value DESC NULLS LAST
      LIMIT 8`);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      address: r.address,
      assetClass: r.asset_class,
      submarket: r.submarket,
      stage: r.stage,
      value: r.value ? Number(r.value) : null,
      ageDays: Number(r.age_days),
      contact: r.contact,
    }));
  }

}
