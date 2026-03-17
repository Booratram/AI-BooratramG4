import { Injectable } from '@nestjs/common';
import { Memory, MemorySource, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';

export interface SearchOptions {
  threshold?: number;
  limit?: number;
}

export interface MemorySearchResult extends Pick<
  Memory,
  'id' | 'content' | 'source' | 'sourceId' | 'metadata' | 'caseId' | 'createdAt' | 'tenantId'
> {
  similarity: number;
}

interface StoreMemoryInput {
  tenantId: string;
  source: MemorySource;
  sourceId?: string;
  caseId?: string;
  content: string;
  metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
}

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async store(input: StoreMemoryInput) {
    const embedding = await this.embeddingsService.embed(input.content);
    const memory = await this.prisma.memory.create({
      data: {
        tenantId: input.tenantId,
        source: input.source,
        sourceId: input.sourceId,
        caseId: input.caseId,
        content: input.content,
        metadata: input.metadata,
      },
    });

    const vectorLiteral = this.vectorLiteral(embedding);
    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Memory"
        SET "embedding" = ${vectorLiteral}::vector
        WHERE "id" = ${memory.id}
      `,
    );

    return memory;
  }

  async search(
    tenantId: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.embeddingsService.embed(query);
    const vectorLiteral = this.vectorLiteral(queryEmbedding);
    const threshold = options.threshold ?? 0.7;
    const limit = options.limit ?? 5;

    return this.prisma.$queryRaw<MemorySearchResult[]>(
      Prisma.sql`
        SELECT
          "id",
          "content",
          "source",
          "sourceId",
          "metadata",
          "caseId",
          "createdAt",
          "tenantId",
          1 - ("embedding" <=> ${vectorLiteral}::vector) AS "similarity"
        FROM "Memory"
        WHERE "tenantId" = ${tenantId}
          AND "embedding" IS NOT NULL
          AND 1 - ("embedding" <=> ${vectorLiteral}::vector) > ${threshold}
        ORDER BY "embedding" <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `,
    );
  }

  async searchOrRecent(
    tenantId: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<MemorySearchResult[] | Memory[]> {
    const hits = await this.search(tenantId, query, options);

    if (hits.length > 0) {
      return hits;
    }

    return this.findRecent(tenantId, options.limit ?? 3);
  }

  findRecent(tenantId: string, limit = 10) {
    return this.prisma.memory.findMany({
      where: { tenantId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  private vectorLiteral(values: number[]) {
    return `[${values.join(',')}]`;
  }
}
