import { Injectable } from '@nestjs/common';
import { CaseCategory } from '@prisma/client';
import { CasesService } from '../cases/cases.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { BrainConfigurator } from './brain-configurator';
import { CaseImporter } from './case-importer';
import { ImportCasesDto } from './dto/import-cases.dto';
import { InterviewDto } from './dto/interview.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
    private readonly casesService: CasesService,
    private readonly caseImporter: CaseImporter,
    private readonly brainConfigurator: BrainConfigurator,
  ) {}

  async runInterview(tenantId: string, dto: InterviewDto) {
    const tenant = await this.tenantsService.findById(tenantId);
    const configuration = this.brainConfigurator.configure({
      companyName: tenant.name,
      industry: tenant.industry,
      description: tenant.brainContext,
    });

    await this.tenantsService.configureBrain(tenantId, configuration);

    const createdCases = [];
    for (const [index, answer] of dto.answers.entries()) {
      const createdCase = await this.casesService.create(tenantId, {
        title: `${index + 1}. ${answer.question}`,
        context: `Onboarding interview for ${tenant.name}`,
        problem: answer.question,
        solution: answer.answer,
        lessons: answer.answer,
        tags: ['onboarding', 'interview'],
        category: CaseCategory.BUSINESS,
        projectId: dto.projectId,
      });
      createdCases.push(createdCase);
    }

    return {
      configured: true,
      createdCases: createdCases.length,
    };
  }

  async importCases(tenantId: string, dto: ImportCasesDto) {
    const items = this.caseImporter.parse(dto.rawData, dto.format);
    const created = [];

    for (const item of items) {
      created.push(await this.casesService.create(tenantId, item));
    }

    return {
      imported: created.length,
    };
  }

  async importCalendar(tenantId: string) {
    return {
      tenantId,
      status: 'pending',
      message: 'Google Calendar import is scaffolded but not wired yet.',
    };
  }

  async status(tenantId: string) {
    const tenant = await this.tenantsService.findById(tenantId);
    const [casesCount, usersCount] = await Promise.all([
      this.prisma.case.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    let completed = 0;
    const total = 5;

    if (tenant.brainName && tenant.brainContext && tenant.brainPersona) completed += 1;
    if (casesCount > 0) completed += 1;
    if (usersCount > 0) completed += 1;
    if (tenant.telegramBotToken) completed += 1;
    if (tenant.status === 'ACTIVE') completed += 1;

    return {
      progress: Math.round((completed / total) * 100),
      checklist: {
        brainConfigured: !!tenant.brainContext,
        seededCases: casesCount,
        usersCount,
        telegramConfigured: !!tenant.telegramBotToken,
        tenantActive: tenant.status === 'ACTIVE',
      },
    };
  }
}
