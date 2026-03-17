import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        ...dto,
        tenantId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        status: dto.status ?? 'TODO',
        priority: dto.priority ?? 'MEDIUM',
        tags: dto.tags ?? [],
      },
      include: {
        subtasks: true,
      },
    });
  }

  findAll(tenantId: string, query: QueryTasksDto) {
    return this.prisma.task.findMany({
      where: {
        tenantId,
        parentId: null,
        status: query.status,
        projectId: query.projectId,
        OR: query.search
          ? [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { subtasks: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateTaskStatusDto) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    await this.prisma.task.delete({ where: { id } });
    return { deleted: true };
  }
}
