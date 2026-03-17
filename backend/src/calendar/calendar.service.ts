import { Injectable } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateEventAiDto } from './dto/create-event-ai.dto';
import { CreateEventDto } from './dto/create-event.dto';

interface ParsedCalendarInput {
  title: string;
  startAt: Date;
  type: EventType;
  projectKey?: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        ...dto,
        tenantId,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        allDay: dto.allDay ?? false,
        type: dto.type ?? 'GENERAL',
        priority: dto.priority ?? 'MEDIUM',
      },
    });
  }

  async today(tenantId: string) {
    const [events, deadlines] = await Promise.all([
      this.getEventsForToday(tenantId),
      this.getDeadlinesForToday(tenantId),
    ]);

    return { events, deadlines };
  }

  week(tenantId: string) {
    return this.getUpcomingEvents(tenantId, 7);
  }

  getEventsForToday(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return this.prisma.calendarEvent.findMany({
      where: {
        tenantId,
        startAt: { gte: start, lte: end },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  getUpcomingEvents(tenantId: string, days = 7) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    return this.prisma.calendarEvent.findMany({
      where: {
        tenantId,
        startAt: { gte: start, lte: end },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.prisma.calendarEvent.deleteMany({
      where: { tenantId, id },
    });

    return { deleted: true };
  }

  async createFromNaturalLanguage(tenantId: string, dto: CreateEventAiDto) {
    const parsed = this.parseNaturalLanguage(dto.input);

    return this.create(tenantId, {
      title: parsed.title,
      description: dto.input,
      startAt: parsed.startAt.toISOString(),
      type: parsed.type,
      projectId: dto.projectId,
    });
  }

  async suggestWeek(tenantId: string) {
    const [events, deadlines, tasks] = await Promise.all([
      this.week(tenantId),
      this.prisma.deadline.findMany({
        where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { dueAt: 'asc' },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: { tenantId, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } },
        orderBy: { dueAt: 'asc' },
        take: 5,
      }),
    ]);

    return {
      events,
      deadlines,
      tasks,
      recommendation:
        'Сначала зафиксируй критические дедлайны на утро, затем сгруппируй встречи по проектам и оставь 2 блока по 90 минут под глубокую работу.',
    };
  }

  parseNaturalLanguage(input: string): ParsedCalendarInput {
    const lower = input.toLowerCase();
    const startAt = new Date();
    startAt.setMinutes(0, 0, 0);
    startAt.setHours(11);

    if (lower.includes('после обеда')) {
      startAt.setHours(14);
    }

    if (lower.includes('вечером')) {
      startAt.setHours(18);
    }

    if (lower.includes('пятниц')) {
      this.moveToNextWeekday(startAt, 5);
    } else if (lower.includes('понедель')) {
      this.moveToNextWeekday(startAt, 1);
    } else if (lower.includes('вторник')) {
      this.moveToNextWeekday(startAt, 2);
    }

    const projectMatch = lower.match(/по\s+([a-z0-9-]+)/i);
    const title = input
      .replace(/в\s.+$/i, '')
      .replace(/^создать\s+/i, '')
      .trim();

    return {
      title: title || 'Событие',
      startAt,
      type: lower.includes('созвон') || lower.includes('встреч') ? EventType.MEETING : EventType.GENERAL,
      projectKey: projectMatch?.[1],
    };
  }

  private getDeadlinesForToday(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return this.prisma.deadline.findMany({
      where: {
        tenantId,
        dueAt: { gte: start, lte: end },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  private moveToNextWeekday(date: Date, targetDay: number) {
    const currentDay = date.getDay();
    const normalizedTarget = targetDay % 7;
    let delta = normalizedTarget - currentDay;

    if (delta <= 0) {
      delta += 7;
    }

    date.setDate(date.getDate() + delta);
  }
}
