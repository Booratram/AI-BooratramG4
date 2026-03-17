import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { plainTextFallback } from './telegram.helpers';
import { TelegramContext } from './telegram.types';

type TelegramTransport = 'disabled' | 'polling' | 'webhook';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  public readonly bot?: Telegraf<TelegramContext>;
  private readonly ownerTelegramId?: string;
  private readonly webhookSecret?: string;
  private readonly backendPublicUrl?: string;
  private readonly transport: TelegramTransport;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('PILOT_TELEGRAM_BOT_TOKEN')?.trim();
    this.ownerTelegramId = this.configService.get<string>('PILOT_TELEGRAM_OWNER_ID')?.trim() || undefined;
    this.webhookSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET')?.trim() || undefined;
    this.backendPublicUrl = this.normalizeBaseUrl(
      this.configService.get<string>('BACKEND_PUBLIC_URL')?.trim(),
    );

    const requestedTransport =
      this.configService.get<string>('TELEGRAM_TRANSPORT', 'auto')?.trim().toLowerCase() ?? 'auto';
    this.transport = this.resolveTransport(requestedTransport, Boolean(token), Boolean(this.backendPublicUrl));

    if (!token || this.transport === 'disabled') {
      this.logger.warn('Telegram runtime is disabled by configuration');
      return;
    }

    this.bot = new Telegraf<TelegramContext>(token);
    this.bot.catch((error) => {
      this.logger.error(`Telegram bot error: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async onModuleInit() {
    if (!this.bot) {
      return;
    }

    if (this.transport === 'webhook') {
      const webhookUrl = this.getWebhookUrl();
      if (!webhookUrl) {
        this.logger.warn('Telegram webhook URL is unavailable; runtime stays disabled');
        return;
      }

      try {
        await this.bot.telegram.setWebhook(
          webhookUrl,
          this.webhookSecret ? { secret_token: this.webhookSecret } : undefined,
        );
        this.logger.log(`Telegram bot configured in webhook mode: ${webhookUrl}`);
      } catch (error) {
        this.logger.error(
          `Telegram webhook setup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return;
    }

    void this.bot
      .launch()
      .then(() => {
        this.logger.log('Telegram bot launched in polling mode');
      })
      .catch((error) => {
        this.logger.error(
          `Telegram polling launch failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  async onModuleDestroy() {
    if (!this.bot) {
      return;
    }

    try {
      if (this.transport === 'webhook') {
        await this.bot.telegram.deleteWebhook();
      }
      this.bot.stop('SIGTERM');
    } catch {
      // The bot may not be running in test or partial startup scenarios.
    }
  }

  isEnabled() {
    return Boolean(this.bot);
  }

  getOwnerTelegramId() {
    return this.ownerTelegramId;
  }

  getStatus() {
    return {
      enabled: Boolean(this.bot),
      transport: this.transport,
      ownerConfigured: Boolean(this.ownerTelegramId),
      webhookConfigured: this.transport === 'webhook',
      webhookUrl: this.transport === 'webhook' ? this.getWebhookUrl() : null,
    };
  }

  async handleWebhookUpdate(update: Record<string, unknown>, secretToken?: string) {
    if (!this.bot || this.transport !== 'webhook') {
      return false;
    }

    if (this.webhookSecret && secretToken !== this.webhookSecret) {
      this.logger.warn('Rejected Telegram webhook request with invalid secret token');
      return false;
    }

    await this.bot.handleUpdate(update as never);
    return true;
  }

  async sendMessage(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
    if (!this.bot) {
      return false;
    }

    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...extra,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Telegram markdown send failed for chatId=${chatId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        await this.bot.telegram.sendMessage(chatId, plainTextFallback(text), extra);
        return true;
      } catch (fallbackError) {
        this.logger.error(
          `Telegram send failed for chatId=${chatId}: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
        return false;
      }
    }
  }

  async alertOwner(text: string) {
    if (!this.ownerTelegramId) {
      this.logger.warn('PILOT_TELEGRAM_OWNER_ID is not configured; owner alert skipped');
      return false;
    }

    return this.sendMessage(this.ownerTelegramId, text);
  }

  private resolveTransport(requestedTransport: string, hasToken: boolean, hasPublicUrl: boolean): TelegramTransport {
    if (!hasToken || requestedTransport === 'off' || requestedTransport === 'disabled') {
      return 'disabled';
    }

    if (requestedTransport === 'polling') {
      return 'polling';
    }

    if (requestedTransport === 'webhook') {
      if (hasPublicUrl) {
        return 'webhook';
      }

      this.logger.warn('TELEGRAM_TRANSPORT=webhook requested without BACKEND_PUBLIC_URL; falling back to polling');
      return 'polling';
    }

    return hasPublicUrl ? 'webhook' : 'polling';
  }

  private getWebhookUrl() {
    if (!this.backendPublicUrl) {
      return undefined;
    }

    return `${this.backendPublicUrl}/api/telegram/webhook`;
  }

  private normalizeBaseUrl(value?: string) {
    if (!value) {
      return undefined;
    }

    return value.replace(/\/+$/, '');
  }
}
