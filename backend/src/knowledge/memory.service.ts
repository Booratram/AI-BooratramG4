import { Injectable } from '@nestjs/common';
import { MemoryService } from '../ai/memory.service';

@Injectable()
export class KnowledgeMemoryService {
  constructor(private readonly memoryService: MemoryService) {}

  search(tenantId: string, query: string, limit?: number) {
    return this.memoryService.search(tenantId, query, { limit });
  }

  recent(tenantId: string, limit?: number) {
    return this.memoryService.findRecent(tenantId, limit);
  }
}
