import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // CORS allowlist (no wildcard) — populated per environment
  app.enableCors({ origin: (process.env.CORS_ALLOWLIST ?? 'http://localhost:3000').split(',').filter(Boolean) });
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();
