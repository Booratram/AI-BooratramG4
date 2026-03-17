import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { AgentService } from './agent.service';
import { AiController } from './ai.controller';
import { DeepseekService } from './deepseek.service';
import { EmbeddingsService } from './embeddings.service';
import { MemoryService } from './memory.service';
import { PromptBuilder } from './prompt-builder';

@Module({
  imports: [TenantsModule],
  controllers: [AiController],
  providers: [
    DeepseekService,
    EmbeddingsService,
    MemoryService,
    PromptBuilder,
    AgentService,
  ],
  exports: [DeepseekService, EmbeddingsService, MemoryService, PromptBuilder, AgentService],
})
export class AiModule {}
