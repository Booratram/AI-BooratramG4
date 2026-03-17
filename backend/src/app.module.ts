import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CalendarModule } from './calendar/calendar.module';
import { CasesModule } from './cases/cases.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { DeadlinesModule } from './deadlines/deadlines.module';
import { HealthModule } from './health/health.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TelegramModule } from './telegram/telegram.module';
import { TenantGuard } from './tenants/tenant.guard';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

function resolveRedisConfig(config: ConfigService) {
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const db = parsed.pathname?.replace('/', '');

      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        password: parsed.password || undefined,
        db: db ? Number(db) || 0 : 0,
      };
    } catch {
      // Fall back to explicit host/port below.
    }
  }

  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: Number(config.get<string>('REDIS_PORT', '6380')),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    db: Number(config.get<string>('REDIS_DB', '0')),
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: resolveRedisConfig(configService),
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AiModule,
    CalendarModule,
    DeadlinesModule,
    ProjectsModule,
    TasksModule,
    CasesModule,
    KnowledgeModule,
    OnboardingModule,
    TelegramModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
