import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { DeadlineAlertProcessor } from './deadline-alert.processor';
import { DeadlinesController } from './deadlines.controller';
import { DeadlineSchedulerService } from './deadline-scheduler.service';
import { DeadlinesService } from './deadlines.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'deadline-alerts',
    }),
    PrismaModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [DeadlinesController],
  providers: [DeadlinesService, DeadlineSchedulerService, DeadlineAlertProcessor],
  exports: [DeadlinesService, DeadlineSchedulerService],
})
export class DeadlinesModule {}
