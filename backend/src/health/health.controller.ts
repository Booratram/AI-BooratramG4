import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  status() {
    return {
      status: 'ok',
      service: 'booratramg4-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
