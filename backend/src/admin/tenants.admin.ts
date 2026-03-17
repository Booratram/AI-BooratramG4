import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipTenant } from '../tenants/decorators/skip-tenant.decorator';
import { ConfigureTenantDto } from '../tenants/dto/configure-tenant.dto';
import { CreateTenantDto } from '../tenants/dto/create-tenant.dto';
import { TenantsService } from '../tenants/tenants.service';

@SkipTenant()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/tenants')
export class TenantsAdminController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Post(':id/configure')
  configure(@Param('id') id: string, @Body() dto: ConfigureTenantDto) {
    return this.tenantsService.configureBrain(id, dto);
  }
}
