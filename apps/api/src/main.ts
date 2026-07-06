import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // CORS allowlist (no wildcard); credentials on for when sessions land
  app.enableCors({
    origin: (process.env.CORS_ALLOWLIST ?? 'http://localhost:3000').split(',').filter(Boolean),
    credentials: true,
  });
  // Render (and most PaaS) inject PORT and require binding to 0.0.0.0, not localhost.
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
void bootstrap();
