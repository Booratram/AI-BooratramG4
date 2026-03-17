import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeMemoryService } from './memory.service';

@Module({
  imports: [AiModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeMemoryService],
})
export class KnowledgeModule {}
