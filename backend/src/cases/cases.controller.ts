import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.casesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.casesService.findOne(tenantId, id);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateCaseDto) {
    return this.casesService.create(tenantId, dto);
  }
}
