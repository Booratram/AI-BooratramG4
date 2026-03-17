import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CalendarModule } from '../calendar/calendar.module';
import { CasesModule } from '../cases/cases.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { TasksModule } from '../tasks/tasks.module';
import { TenantsModule } from '../tenants/tenants.module';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';

@Module({
  imports: [
    AiModule,
    CalendarModule,
    CasesModule,
    TasksModule,
    TenantsModule,
    PrismaModule,
    forwardRef(() => DeadlinesModule),
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
