import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { TenantsModule } from '../tenants/tenants.module';
import { BrainConfigurator } from './brain-configurator';
import { CaseImporter } from './case-importer';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [TenantsModule, CasesModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, CaseImporter, BrainConfigurator],
})
export class OnboardingModule {}
