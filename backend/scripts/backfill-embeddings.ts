import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { EmbeddingsService } from '../src/ai/embeddings.service';

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function vectorLiteral(values: number[]) {
  return `[${values.join(',')}]`;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const config = new ConfigService(process.env);
    const embeddingsService = new EmbeddingsService(config);
    const status = embeddingsService.getStatus();
    const tenantId = process.env.MEMORY_EMBED_BACKFILL_TENANT_ID?.trim() || undefined;
    const batchSize = readPositiveInteger(process.env.MEMORY_EMBED_BACKFILL_BATCH_SIZE, 25);
    const limit = process.env.MEMORY_EMBED_BACKFILL_LIMIT
      ? readPositiveInteger(process.env.MEMORY_EMBED_BACKFILL_LIMIT, batchSize)
      : undefined;
    const force = process.env.MEMORY_EMBED_BACKFILL_FORCE === 'true';

    if (!status.live && !force) {
      throw new Error(
        `Live embeddings are unavailable: ${status.fallbackReason ?? 'unknown reason'}. ` +
          'Set OPENAI_API_KEY or run with MEMORY_EMBED_BACKFILL_FORCE=true if you intentionally want fallback vectors.',
      );
    }

    console.log(
      [
        '[embeddings] Backfill starting',
        `configured=${status.configuredProvider}`,
        `effective=${status.effectiveProvider}`,
        `tenant=${tenantId ?? 'all'}`,
        `batchSize=${batchSize}`,
        `limit=${limit ?? 'all'}`,
      ].join(' | '),
    );

    let cursor: string | undefined;
    let processed = 0;

    while (true) {
      const take = limit ? Math.min(batchSize, Math.max(limit - processed, 0)) : batchSize;
      if (take <= 0) {
        break;
      }

      const memories = await prisma.memory.findMany({
        where: tenantId ? { tenantId } : undefined,
        select: {
          id: true,
          tenantId: true,
          content: true,
        },
        orderBy: {
          id: 'asc',
        },
        take,
        ...(cursor
          ? {
              skip: 1,
              cursor: { id: cursor },
            }
          : {}),
      });

      if (memories.length === 0) {
        break;
      }

      for (const memory of memories) {
        const embedding = await embeddingsService.embed(memory.content);
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "Memory"
            SET "embedding" = ${vectorLiteral(embedding)}::vector
            WHERE "id" = ${memory.id}
          `,
        );
        processed += 1;
      }

      cursor = memories[memories.length - 1]?.id;
      console.log(`[embeddings] Updated ${processed} memories`);
    }

    console.log(`[embeddings] Backfill complete: ${processed} memories updated`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
