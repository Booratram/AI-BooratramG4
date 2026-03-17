import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { SkipTenant } from '../tenants/decorators/skip-tenant.decorator';

@SkipTenant()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/analytics')
export class AnalyticsAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async summary() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalTenants,
      activeTenants,
      totalCases,
      casesThisMonth,
      totalAiRequests,
      aiLogs,
      industries,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.case.count(),
      this.prisma.case.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.aiRequestLog.count(),
      this.prisma.aiRequestLog.findMany({
        where: { responseTimeMs: { not: null } },
        select: { responseTimeMs: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.tenant.findMany({
        where: { industry: { not: null } },
        select: { industry: true },
      }),
    ]);

    const validLogs = aiLogs.filter((item) => typeof item.responseTimeMs === 'number');
    const avgResponseTime = validLogs.length > 0
      ? Math.round(validLogs.reduce((sum, item) => sum + (item.responseTimeMs ?? 0), 0) / validLogs.length)
      : 0;
    const topIndustries = [...new Set(industries.map((item) => item.industry).filter(Boolean))].slice(0, 5);

    return {
      totalTenants,
      activeTenants,
      totalCases,
      casesThisMonth,
      totalAiRequests,
      avgResponseTime,
      topIndustries,
    };
  }
}
