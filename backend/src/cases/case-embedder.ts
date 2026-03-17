import { Injectable } from '@nestjs/common';
import { Case, MemorySource } from '@prisma/client';
import { MemoryService } from '../ai/memory.service';

@Injectable()
export class CaseEmbedder {
  constructor(private readonly memoryService: MemoryService) {}

  async embed(createdCase: Case) {
    const content = [
      createdCase.title,
      createdCase.context,
      createdCase.problem,
      createdCase.solution,
      createdCase.outcome,
      createdCase.lessons,
    ]
      .filter(Boolean)
      .join(' | ');

    return this.memoryService.store({
      tenantId: createdCase.tenantId,
      source: MemorySource.CASE,
      sourceId: createdCase.id,
      caseId: createdCase.id,
      content,
      metadata: {
        tags: createdCase.tags,
        category: createdCase.category,
        impact: createdCase.impact,
      },
    });
  }
}
