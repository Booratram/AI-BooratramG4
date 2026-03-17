import { Injectable } from '@nestjs/common';
import { AiRequestStatus, Channel, MemorySource } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { ChatMessage, DeepseekService } from './deepseek.service';
import { EmbeddingsService } from './embeddings.service';
import { MemoryService } from './memory.service';
import { PromptBuilder } from './prompt-builder';

export interface AgentReply {
  content: string;
  memoriesUsed: number;
  model?: string;
  usedReasoner: boolean;
  embeddingMode: string;
}

interface AgentChatOptions {
  useReasoner?: boolean;
}

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
    private readonly memoryService: MemoryService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly promptBuilder: PromptBuilder,
    private readonly deepseekService: DeepseekService,
  ) {}

  async chat(
    tenantId: string,
    input: string,
    history: ChatMessage[] = [],
    channel: Channel = Channel.WEB,
    userId?: string,
    options: AgentChatOptions = {},
  ): Promise<AgentReply> {
    const startedAt = Date.now();
    const tenant = await this.tenantsService.findById(tenantId);
    const memories = await this.memoryService.searchOrRecent(tenantId, input, {
      threshold: 0.55,
      limit: 5,
    });
    const operationalContext = await this.tenantsService.getTenantOperationalContext(tenantId);
    const systemPrompt = this.promptBuilder.build(tenant, memories, operationalContext);
    const useReasoner =
      options.useReasoner ?? this.shouldUseReasoner(input, history, memories.length);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...history,
      {
        role: 'user',
        content: input,
      },
    ];

    try {
      const result = await this.deepseekService.chat(messages, { useReasoner });
      const conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          channel,
          summary: this.buildConversationSummary(input, result.content),
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: result.content,
            },
          ],
        },
      });

      await this.persistConversationMemory(tenantId, conversation.id, input, result.content, memories.length);

      await this.prisma.aiRequestLog.create({
        data: {
          tenantId,
          userId,
          channel,
          input,
          response: result.content,
          model: result.model,
          status: AiRequestStatus.SUCCESS,
          responseTimeMs: Date.now() - startedAt,
          memoriesUsed: memories.length,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
        },
      });

      return {
        content: result.content,
        memoriesUsed: memories.length,
        model: result.model,
        usedReasoner: result.usedReasoner,
        embeddingMode: this.embeddingsService.getStatus().mode,
      };
    } catch (error) {
      await this.prisma.aiRequestLog.create({
        data: {
          tenantId,
          userId,
          channel,
          input,
          status: AiRequestStatus.ERROR,
          error: error instanceof Error ? error.message : 'Unknown AI error',
          responseTimeMs: Date.now() - startedAt,
          memoriesUsed: memories.length,
        },
      });

      throw error;
    }
  }

  private shouldUseReasoner(input: string, history: ChatMessage[], memoriesUsed: number) {
    const normalized = input.toLowerCase();
    const keywords = [
      'проанализ',
      'сравни',
      'сравнить',
      'стратег',
      'план',
      'почему',
      'риски',
      'архитект',
      'оптимиз',
      'декомпоз',
      'compare',
      'analy',
      'strategy',
      'risk',
    ];

    return (
      normalized.length >= 180 ||
      history.length >= 6 ||
      memoriesUsed >= 4 ||
      keywords.some((keyword) => normalized.includes(keyword))
    );
  }

  private buildConversationSummary(input: string, output: string) {
    return `${input.trim()} -> ${output.trim()}`.slice(0, 180);
  }

  private async persistConversationMemory(
    tenantId: string,
    conversationId: string,
    input: string,
    output: string,
    memoriesUsed: number,
  ) {
    const compactOutput = output.replace(/\s+/g, ' ').trim();
    if (compactOutput.length < 80) {
      return;
    }

    try {
      await this.memoryService.store({
        tenantId,
        source: MemorySource.CONVERSATION,
        sourceId: conversationId,
        content: [`Вопрос: ${input.trim()}`, `Ответ: ${compactOutput}`].join(' | '),
        metadata: {
          kind: 'agent_chat',
          memoriesUsed,
        },
      });
    } catch {
      // Conversation persistence should not break the primary AI reply path.
    }
  }
}
