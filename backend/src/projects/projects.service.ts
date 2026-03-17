import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        tenantId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  findAll(tenantId: string, query: QueryProjectsDto) {
    return this.prisma.project.findMany({
      where: {
        tenantId,
        status: query.status,
        OR: query.search
          ? [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateProjectStatusDto) {
    const project = await this.prisma.project.findFirst({ where: { id, tenantId } });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return this.prisma.project.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, tenantId } });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }
}
