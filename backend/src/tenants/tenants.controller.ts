import { Controller, Get } from '@nestjs/common';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  current(@CurrentTenant() tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }
}
