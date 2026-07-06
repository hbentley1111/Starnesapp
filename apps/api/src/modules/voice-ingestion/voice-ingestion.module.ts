import { Module } from '@nestjs/common';
import { VoiceIngestionService } from './voice-ingestion.service';
import { VoiceIngestionController } from './voice-ingestion.controller';
import { ExtractionModule } from '../extraction/extraction.module';

@Module({
  imports: [ExtractionModule],
  controllers: [VoiceIngestionController],
  providers: [VoiceIngestionService],
  exports: [VoiceIngestionService],
})
export class VoiceIngestionModule {}
