import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SkipTenant } from '../tenants/decorators/skip-tenant.decorator';
import { TelegramService } from './telegram.service';

@Controller('telegram')
@Public()
@SkipTenant()
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  status() {
    return this.telegramService.getStatus();
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: Record<string, unknown>,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ) {
    const accepted = await this.telegramService.handleWebhookUpdate(update, secretToken);

    return {
      ok: true,
      accepted,
    };
  }
}
