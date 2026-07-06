import { Module } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { ExtractionController } from './extraction.controller';
import { ExtractionRunnerService } from './extraction-runner.service';
import { DemoExtractionProvider } from './extraction-provider';

@Module({
  controllers: [ExtractionController],
  providers: [ExtractionService, ExtractionRunnerService, DemoExtractionProvider],
  exports: [ExtractionService, ExtractionRunnerService],
})
export class ExtractionModule {}
