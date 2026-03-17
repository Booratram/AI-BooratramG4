import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { CalendarService } from './calendar.service';
import { CreateEventAiDto } from './dto/create-event-ai.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('today')
  today(@CurrentTenant() tenantId: string) {
    return this.calendarService.today(tenantId);
  }

  @Get('week')
  week(@CurrentTenant() tenantId: string) {
    return this.calendarService.week(tenantId);
  }

  @Post('events')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateEventDto) {
    return this.calendarService.create(tenantId, dto);
  }

  @Delete('events/:id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.calendarService.remove(tenantId, id);
  }

  @Post('events/ai')
  createFromAi(@CurrentTenant() tenantId: string, @Body() dto: CreateEventAiDto) {
    return this.calendarService.createFromNaturalLanguage(tenantId, dto);
  }

  @Post('suggest')
  suggest(@CurrentTenant() tenantId: string) {
    return this.calendarService.suggestWeek(tenantId);
  }
}
