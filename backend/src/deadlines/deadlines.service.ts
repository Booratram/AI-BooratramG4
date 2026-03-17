import { DeadlineStatus, Priority } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { formatAlertMessage } from '../telegram/telegram.helpers';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { QueryDeadlinesDto } from './dto/query-deadlines.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { UpdateDeadlineStatusDto } from './dto/update-deadline-status.dto';
import { DeadlineSchedulerService } from './deadline-scheduler.service';

@Injectable()
export class DeadlinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: DeadlineSchedulerService,
  ) {}

  async create(tenantId: string, dto: CreateDeadlineDto) {
    const deadline = await this.prisma.deadline.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueAt: new Date(dto.dueAt),
        priority: dto.priority ?? Priority.HIGH,
        projectId: dto.projectId,
        tenantId,
      },
    });

    const schedule = await this.scheduler.scheduleAlerts(deadline);
    return {
      deadline,
      schedule,
    };
  }

  list(tenantId: string, query: QueryDeadlinesDto) {
    const until = query.days
      ? new Date(Date.now() + query.days * 24 * 60 * 60 * 1000)
      : undefined;

    return this.prisma.deadline.findMany({
      where: {
        tenantId,
        status: query.status,
        priority: query.priority,
        projectId: query.projectId,
        dueAt: {
          ...(query.overdue === 'true' ? { lt: new Date() } : {}),
          ...(until ? { lte: until } : {}),
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDeadlineDto) {
    await this.findOwned(tenantId, id);

    const deadline = await this.prisma.deadline.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        priority: dto.priority,
        projectId: dto.projectId,
        status: dto.status,
        completedAt:
          dto.status === DeadlineStatus.COMPLETED ? new Date() : dto.status ? null : undefined,
      },
    });

    await this.scheduler.cancelAlerts(id);
    if (
      deadline.status !== DeadlineStatus.COMPLETED &&
      deadline.status !== DeadlineStatus.CANCELLED &&
      deadline.dueAt.getTime() > Date.now()
    ) {
      await this.scheduler.scheduleAlerts(deadline);
    }

    return deadline;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateDeadlineStatusDto) {
    if (dto.status === DeadlineStatus.COMPLETED) {
      return this.complete(tenantId, id);
    }

    const deadline = await this.findOwned(tenantId, id);
    const updated = await this.prisma.deadline.update({
      where: { id },
      data: {
        status: dto.status,
        completedAt: null,
      },
    });

    if (dto.status === DeadlineStatus.CANCELLED) {
      await this.scheduler.cancelAlerts(id);
    } else if (
      deadline.status !== dto.status &&
      updated.dueAt.getTime() > Date.now() &&
      dto.status !== DeadlineStatus.OVERDUE
    ) {
      await this.scheduler.cancelAlerts(id);
      await this.scheduler.scheduleAlerts(updated);
    }

    return updated;
  }

  async complete(tenantId: string, id: string) {
    await this.findOwned(tenantId, id);

    const deadline = await this.prisma.deadline.update({
      where: { id },
      data: {
        status: DeadlineStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.scheduler.cancelAlerts(id);
    return deadline;
  }

  async remove(tenantId: string, id: string) {
    await this.findOwned(tenantId, id);
    await this.scheduler.cancelAlerts(id);
    await this.prisma.deadline.delete({ where: { id } });
    return { deleted: true };
  }

  async getUpcoming(tenantId: string, days = 7) {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.deadline.findMany({
      where: {
        tenantId,
        status: { in: [DeadlineStatus.PENDING, DeadlineStatus.IN_PROGRESS, DeadlineStatus.OVERDUE] },
        dueAt: { lte: until },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async getUrgent(tenantId: string) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.prisma.deadline.findMany({
      where: {
        tenantId,
        status: { in: [DeadlineStatus.PENDING, DeadlineStatus.IN_PROGRESS, DeadlineStatus.OVERDUE] },
        dueAt: { lte: tomorrow },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async sendPreviewAlert(tenantId: string, id: string) {
    const deadline = await this.findOwned(tenantId, id);
    return {
      preview: formatAlertMessage(deadline, 30),
    };
  }

  getQueueStats() {
    return this.scheduler.getQueueStats();
  }

  private async findOwned(tenantId: string, id: string) {
    const deadline = await this.prisma.deadline.findFirst({
      where: { id, tenantId },
    });

    if (!deadline) {
      throw new NotFoundException(`Deadline ${id} not found`);
    }

    return deadline;
  }
}
