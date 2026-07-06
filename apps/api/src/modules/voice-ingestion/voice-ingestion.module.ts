import { Module } from "@nestjs/common";
import { VoiceIngestionService } from "./voice-ingestion.service";

@Module({ providers: [VoiceIngestionService], exports: [VoiceIngestionService] })
export class VoiceIngestionModule {}
