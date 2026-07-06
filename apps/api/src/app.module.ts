import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthRbacModule } from './modules/auth-rbac/auth-rbac.module';
import { GoogleWorkspaceConnectorModule } from './modules/google-workspace-connector/google-workspace-connector.module';
import { VoiceIngestionModule } from './modules/voice-ingestion/voice-ingestion.module';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CadenceModule } from './modules/cadence/cadence.module';
import { LeadIntakeModule } from './modules/lead-intake/lead-intake.module';
import { PrioritizationModule } from './modules/prioritization/prioritization.module';
import { HitlGatewayModule } from './modules/hitl-gateway/hitl-gateway.module';
import { AgentOrchestrationModule } from './modules/agent-orchestration/agent-orchestration.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MigrationModule } from './modules/migration/migration.module';
import { MarketDataModule } from './modules/market-data/market-data.module';

/**
 * Modular Monolith — twelve enforced module seams (§2.2):
 * auth-rbac · google-workspace-connector · voice-ingestion · extraction ·
 * contacts (entity resolution + opportunity pipeline) · cadence · lead-intake ·
 * prioritization · hitl-gateway (the single external-write choke point) ·
 * agent-orchestration · notifications · migration.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuditModule,
    AuthRbacModule,
    GoogleWorkspaceConnectorModule,
    VoiceIngestionModule,
    ExtractionModule,
    ContactsModule,
    CadenceModule,
    LeadIntakeModule,
    PrioritizationModule,
    HitlGatewayModule,
    AgentOrchestrationModule,
    NotificationsModule,
    MigrationModule,
    MarketDataModule,
  ],
})
export class AppModule {}
