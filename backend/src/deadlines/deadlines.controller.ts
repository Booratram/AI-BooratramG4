import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { QueryDeadlinesDto } from './dto/query-deadlines.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { UpdateDeadlineStatusDto } from './dto/update-deadline-status.dto';
import { DeadlinesService } from './deadlines.service';

@Controller('deadlines')
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @Get('urgent')
  urgent(@CurrentTenant() tenantId: string) {
    return this.deadlinesService.getUrgent(tenantId);
  }

  @Get('queue/stats')
  queueStats() {
    return this.deadlinesService.getQueueStats();
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: QueryDeadlinesDto) {
    return this.deadlinesService.list(tenantId, query);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateDeadlineDto) {
    return this.deadlinesService.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeadlineDto,
  ) {
    return this.deadlinesService.update(tenantId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeadlineStatusDto,
  ) {
    return this.deadlinesService.updateStatus(tenantId, id, dto);
  }

  @Patch(':id/complete')
  complete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.deadlinesService.complete(tenantId, id);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.deadlinesService.remove(tenantId, id);
  }

  @Post(':id/preview-alert')
  previewAlert(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.deadlinesService.sendPreviewAlert(tenantId, id);
  }
}
