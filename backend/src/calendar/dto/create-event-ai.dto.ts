import { IsOptional, IsString } from 'class-validator';

export class CreateEventAiDto {
  @IsString()
  input!: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}
