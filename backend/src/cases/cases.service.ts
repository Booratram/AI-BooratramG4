import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CaseEmbedder } from './case-embedder';
import { CreateCaseDto } from './dto/create-case.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEmbedder: CaseEmbedder,
  ) {}

  async create(tenantId: string, dto: CreateCaseDto) {
    const createdCase = await this.prisma.case.create({
      data: {
        ...dto,
        tenantId,
      },
    });

    await this.caseEmbedder.embed(createdCase);
    return createdCase;
  }

  findAll(tenantId: string) {
    return this.prisma.case.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.case.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Case ${id} not found`);
    }

    return item;
  }
}
