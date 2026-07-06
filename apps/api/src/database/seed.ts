/** Dev seed — mirrors the Phase-B mock data so the wired UI shows the same world. Idempotent (truncates dev tables). */
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = (text: string, params?: unknown[]) => pool.query(text, params);

  await q(`TRUNCATE opportunity_contact, extracted_entity, interaction, follow_up, cadence_schedule,
           approval_decision, outreach_draft, opportunity, contact_property, need, lead, routing_rule,
           contact, property, company, agent_run, session, app_user RESTART IDENTITY CASCADE`);

  const founder = (await q(
    `INSERT INTO app_user (google_sub, email, name, role) VALUES ('dev-sub-jaben','jaben@starnesre.dev','Jaben Starnes','founder') RETURNING id`,
  )).rows[0].id;

  const co = async (name: string) =>
    (await q(`INSERT INTO company (name, normalized_name) VALUES ($1, lower($1)) RETURNING id`, [name])).rows[0].id;
  const apex = await co('Apex Logistics');
  const bell = await co('Bell Family Holdings');
  const raman = await co('Raman Capital');
  const ellery = await co('Ellery Dental Group');

  const contact = async (name: string, companyId: string, lastDays: number) =>
    (await q(
      `INSERT INTO contact (full_name, normalized_name, company_id, owner_user_id, last_contacted_at)
       VALUES ($1, lower($1), $2, $3, now() - ($4 || ' days')::interval) RETURNING id`,
      [name, companyId, founder, lastDays],
    )).rows[0].id;
  const dana = await contact('Dana Whitfield', apex, 2);
  const marcus = await contact('Marcus Bell', bell, 1);
  const priya = await contact('Priya Raman', raman, 41);
  const tom = await contact('Tom Ellery', ellery, 12);

  const cadence = async (contactId: string, tier: number, dueDays: number) =>
    q(
      `INSERT INTO cadence_schedule (contact_id, tier, next_due_at, last_touch_at)
       VALUES ($1, $2, now() + ($3 || ' days')::interval, now())`,
      [contactId, tier, dueDays],
    );
  await cadence(dana, 30, 28);
  await cadence(marcus, 60, 59);
  await cadence(priya, 30, -11); // overdue
  await cadence(tom, 90, 78);

  for (const [cId, days, status] of [
    [dana, 1, 'due'], [marcus, 3, 'due'], [priya, -11, 'overdue'], [priya, -2, 'overdue'], [tom, 6, 'due'],
  ] as const) {
    await q(`INSERT INTO follow_up (contact_id, due_at, status) VALUES ($1, now() + ($2 || ' days')::interval, $3)`, [cId, days, status]);
  }

  const prop = async (address: string, assetClass: string) =>
    (await q(`INSERT INTO property (address, normalized_address, asset_class) VALUES ($1, lower($1), $2) RETURNING id`, [address, assetClass])).rows[0].id;
  const oldCharlotte = await prop('4120 Old Charlotte Highway', 'industrial');
  const tryon = await prop('217 South Tryon', 'office');
  const monroe = await prop('Monroe Rd retail', 'retail');

  const opp = async (type: string, title: string, propertyId: string | null, stage: string | null, status: string | null, value: number | null, contactId: string, role: string) => {
    const id = (await q(
      `INSERT INTO opportunity (opportunity_type, title, property_id, stage, status, value, broker_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [type, title, propertyId, stage, status, value, founder],
    )).rows[0].id;
    await q(`INSERT INTO opportunity_contact (opportunity_id, contact_id, role) VALUES ($1,$2,$3)`, [id, contactId, role]);
    return id;
  };
  await opp('tenant_requirement', '4120 Old Charlotte Hwy · lease', oldCharlotte, null, 'active', null, dana, 'tenant');
  await opp('owner_intel', '217 South Tryon · owner intel', tryon, null, 'open', null, marcus, 'owner');
  await opp('listing', 'Monroe Rd retail listing', monroe, 'negotiating', null, 1900000, tom, 'seller');
  await opp('investor_opportunity', 'Raman Capital · $250k to place', null, null, 'active', 250000, priya, 'investor');
  await opp('buyer_rep', 'NC Music Factory office · buyer rep', null, 'prospecting', null, 1450000, priya, 'buyer');

  // Marcus Bell call → interaction + extracted_entity fields (one garbled low-confidence address)
  const transcript = 'SPEAKER 1: the one at 217 South Tryon, the office tower... SPEAKER 2 (Marcus Bell): Bell Family Holdings is not going to keep it forever... twelve, eighteen months we start seriously looking at selling... SPEAKER 1: I will circle back with you in September.';
  const interaction = (await q(
    `INSERT INTO interaction (source, activity_type, external_id, content_hash, raw_transcript, occurred_at, contact_id, property_id)
     VALUES ('fireflies','transcript','ff-meeting-8821',$1,$2, now() - interval '1 day', $3, $4) RETURNING id`,
    [createHash('sha256').update(transcript).digest('hex'), transcript, marcus, tryon],
  )).rows[0].id;

  const ee = (target: string, key: string, value: unknown, span: [number, number], conf: number) =>
    q(
      `INSERT INTO extracted_entity (interaction_id, target_type, field_key, field_value, provenance, confidence, status, prompt_version, model_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'extraction@v1','claude-sonnet-4-6')`,
      [interaction, target, key, JSON.stringify(value), JSON.stringify({ source: `interaction:${interaction}`, span: { start: span[0], end: span[1] } }), conf, conf < 0.75 ? 'needs_review' : 'pending_review'],
    );
  await ee('contact', 'full_name', 'Marcus Bell', [58, 90], 0.85);
  await ee('company', 'name', 'Bell Family Holdings', [92, 130], 0.6);
  await ee('property', 'address', '271 South Tryon · office', [16, 45], 0.55);
  await ee('intent', 'intent', 'Owner considering selling in 12-18 months', [130, 200], 0.8);
  await ee('opportunity_type', 'opportunity_type', 'owner_intel', [130, 200], 0.8);
  await ee('next_action', 'description', 'Circle back with Marcus in September', [200, 250], 0.9);

  await q(
    `INSERT INTO outreach_draft (contact_id, channel, generated_body, approval_state)
     VALUES ($1,'gmail','Hi Dana — following up with three warehouse options that fit the 40k sqft brief...','pending_approval')`,
    [dana],
  );
  await q(
    `INSERT INTO outreach_draft (contact_id, channel, generated_body, approval_state)
     VALUES ($1,'calendar','Site tour · 4120 Old Charlotte Hwy · Thu 10:00','pending_approval')`,
    [dana],
  );

  await q(`INSERT INTO lead (name, contact_info, source) VALUES ('Web inquiry — flex space', '{"email":"ops@carolinabrew.co"}', 'website'), ('Referral — medical office', '{"phone":"704-555-0199"}', 'referral')`);

  console.log('seeded dev data');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
