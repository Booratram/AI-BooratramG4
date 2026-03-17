import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class InterviewAnswerDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;
}

export class InterviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewAnswerDto)
  answers!: InterviewAnswerDto[];

  @IsOptional()
  @IsString()
  projectId?: string;
}
