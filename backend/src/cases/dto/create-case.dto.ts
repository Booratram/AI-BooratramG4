import { CaseCategory } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCaseDto {
  @IsString()
  title!: string;

  @IsString()
  context!: string;

  @IsString()
  problem!: string;

  @IsString()
  solution!: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  lessons?: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsEnum(CaseCategory)
  category!: CaseCategory;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  impact?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  projectId?: string;
}
