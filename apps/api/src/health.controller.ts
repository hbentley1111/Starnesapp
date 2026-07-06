import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './database/database.module';

/** Health check for Render (and any uptime watchdog). Verifies DB connectivity. */
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check() {
    await this.pool.query('SELECT 1');
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
