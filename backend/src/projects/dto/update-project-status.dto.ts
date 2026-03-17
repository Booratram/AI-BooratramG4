import { ProjectStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;
}
