import { Injectable } from '@nestjs/common';
import { CaseCategory } from '@prisma/client';
import { CreateCaseDto } from '../cases/dto/create-case.dto';

const REQUIRED_FIELDS = ['title', 'context', 'problem', 'solution'] as const;

@Injectable()
export class CaseImporter {
  parse(rawData: string, format: 'json' | 'csv'): CreateCaseDto[] {
    if (format === 'json') {
      const payload = JSON.parse(rawData);

      if (!Array.isArray(payload)) {
        throw new Error('JSON import must be an array of cases');
      }

      return payload.map((item) => this.normalizeCase(item));
    }

    const [headerLine, ...rows] = rawData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!headerLine) {
      throw new Error('CSV import is empty');
    }

    const headers = headerLine.split(',').map((item) => item.trim());
    for (const field of REQUIRED_FIELDS) {
      if (!headers.includes(field)) {
        throw new Error(`CSV import is missing required field: ${field}`);
      }
    }

    return rows.map((row) => {
      const values = row.split(',').map((item) => item.trim());
      const mapped = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      return this.normalizeCase(mapped);
    });
  }

  private normalizeCase(input: Record<string, unknown>): CreateCaseDto {
    for (const field of REQUIRED_FIELDS) {
      if (!input[field] || typeof input[field] !== 'string') {
        throw new Error(`Imported case is missing required field: ${field}`);
      }
    }

    const categoryValue = typeof input.category === 'string' ? input.category : 'BUSINESS';
    const category = Object.values(CaseCategory).includes(categoryValue as CaseCategory)
      ? (categoryValue as CaseCategory)
      : CaseCategory.BUSINESS;

    return {
      title: input.title as string,
      context: input.context as string,
      problem: input.problem as string,
      solution: input.solution as string,
      outcome: typeof input.outcome === 'string' && input.outcome ? input.outcome : undefined,
      lessons: typeof input.lessons === 'string' && input.lessons ? input.lessons : undefined,
      tags: typeof input.tags === 'string'
        ? input.tags.split('|').map((item) => item.trim()).filter(Boolean)
        : Array.isArray(input.tags)
          ? input.tags.filter((item): item is string => typeof item === 'string')
          : [],
      category,
      industry: typeof input.industry === 'string' && input.industry ? input.industry : undefined,
      impact: typeof input.impact === 'number'
        ? input.impact
        : typeof input.impact === 'string' && input.impact
          ? Number(input.impact)
          : undefined,
      isPublic: input.isPublic === true || input.isPublic === 'true',
      projectId: typeof input.projectId === 'string' && input.projectId ? input.projectId : undefined,
    };
  }
}
