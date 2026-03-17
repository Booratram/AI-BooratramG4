import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { ImportCasesDto } from './dto/import-cases.dto';
import { InterviewDto } from './dto/interview.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('interview')
  interview(@CurrentTenant() tenantId: string, @Body() dto: InterviewDto) {
    return this.onboardingService.runInterview(tenantId, dto);
  }

  @Post('import/cases')
  importCases(@CurrentTenant() tenantId: string, @Body() dto: ImportCasesDto) {
    return this.onboardingService.importCases(tenantId, dto);
  }

  @Post('import/calendar')
  importCalendar(@CurrentTenant() tenantId: string) {
    return this.onboardingService.importCalendar(tenantId);
  }

  @Get('status')
  status(@CurrentTenant() tenantId: string) {
    return this.onboardingService.status(tenantId);
  }
}
