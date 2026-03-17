import { DeadlineStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDeadlineStatusDto {
  @IsEnum(DeadlineStatus)
  status!: DeadlineStatus;
}
