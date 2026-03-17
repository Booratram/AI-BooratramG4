import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { plainTextFallback } from './telegram.helpers';
import { TelegramContext } from './telegram.types';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  public readonly bot?: Telegraf<TelegramContext>;
  private readonly ownerTelegramId?: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('PILOT_TELEGRAM_BOT_TOKEN')?.trim();
    this.ownerTelegramId = this.configService.get<string>('PILOT_TELEGRAM_OWNER_ID')?.trim() || undefined;

    if (!token) {
      this.logger.warn('PILOT_TELEGRAM_BOT_TOKEN is not configured; Telegram runtime is disabled');
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

    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      this.logger.log('Telegram runtime initialized in production mode; webhook is expected');
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
      this.bot.stop('SIGTERM');
    } catch {
      // Bot may not be running when the app context is created in production mode for smoke tests.
    }
  }

  isEnabled() {
    return Boolean(this.bot);
  }

  getOwnerTelegramId() {
    return this.ownerTelegramId;
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
}
