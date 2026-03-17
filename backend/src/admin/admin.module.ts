import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { AnalyticsAdminController } from './analytics.admin';
import { TenantsAdminController } from './tenants.admin';

@Module({
  imports: [TenantsModule],
  controllers: [TenantsAdminController, AnalyticsAdminController],
})
export class AdminModule {}
