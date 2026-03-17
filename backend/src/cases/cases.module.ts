import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CaseEmbedder } from './case-embedder';

@Module({
  imports: [AiModule],
  controllers: [CasesController],
  providers: [CasesService, CaseEmbedder],
  exports: [CasesService],
})
export class CasesModule {}
