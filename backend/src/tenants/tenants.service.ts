import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigureTenantDto } from './dto/configure-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        industry: dto.industry,
        plan: dto.plan,
        status: dto.status,
        language: dto.language ?? 'ru',
        brainName: dto.brainName ?? 'G4',
      },
    });
  }

  findAll() {
    return this.prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            users: true,
            cases: true,
            memories: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${slug} not found`);
    }

    return tenant;
  }

  async configureBrain(id: string, dto: ConfigureTenantDto) {
    await this.findById(id);

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async getTenantOperationalContext(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const [projects, tasks, deadlines, todayEvents] = await Promise.all([
      this.prisma.project.count({
        where: {
          tenantId,
          status: {
            in: ['ACTIVE', 'PAUSED'],
          },
        },
      }),
      this.prisma.task.count({
        where: {
          tenantId,
          status: {
            in: ['TODO', 'IN_PROGRESS', 'REVIEW'],
          },
        },
      }),
      this.prisma.deadline.findMany({
        where: {
          tenantId,
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
        },
        orderBy: {
          dueAt: 'asc',
        },
        take: 3,
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          tenantId,
          startAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        orderBy: {
          startAt: 'asc',
        },
        take: 5,
      }),
    ]);

    return [
      `Активных проектов: ${projects}`,
      `Открытых задач: ${tasks}`,
      `Ближайшие дедлайны: ${deadlines.map((item) => `${item.title} (${item.dueAt.toISOString()})`).join(', ') || 'нет'}`,
      `События сегодня: ${todayEvents.map((item) => item.title).join(', ') || 'нет'}`,
    ].join('\n');
  }
}
