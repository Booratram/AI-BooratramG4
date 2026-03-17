import { Channel } from '@prisma/client';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/http/request-context';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { AgentService } from './agent.service';
import { DeepseekService } from './deepseek.service';
import { EmbeddingsService } from './embeddings.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('brain')
export class AiController {
  constructor(
    private readonly agentService: AgentService,
    private readonly deepseekService: DeepseekService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  @Get('status')
  status() {
    return {
      deepseek: this.deepseekService.getStatus(),
      embeddings: this.embeddingsService.getStatus(),
    };
  }

  @Post('chat')
  chat(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChatRequestDto,
  ) {
    return this.agentService.chat(tenantId, dto.message, dto.history ?? [], Channel.WEB, user?.userId, {
      useReasoner: dto.useReasoner,
    });
  }
}
