import { Controller, Get, Query } from '@nestjs/common';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { KnowledgeMemoryService } from './memory.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeMemoryService) {}

  @Get('search')
  search(
    @CurrentTenant() tenantId: string,
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.knowledgeService.search(tenantId, query, limit ? Number(limit) : undefined);
  }

  @Get('recent')
  recent(@CurrentTenant() tenantId: string, @Query('limit') limit?: string) {
    return this.knowledgeService.recent(tenantId, limit ? Number(limit) : undefined);
  }
}
