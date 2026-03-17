import { Channel } from '@prisma/client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '../ai/agent.service';
import { CalendarService } from '../calendar/calendar.service';
import { CasesService } from '../cases/cases.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { DeadlinesService } from '../deadlines/deadlines.service';
import { TasksService } from '../tasks/tasks.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  formatDailyBrief,
  formatWeekPlan,
  plainTextFallback,
} from './telegram.helpers';
import { PendingTelegramAction, TelegramContext } from './telegram.types';
import { TelegramService } from './telegram.service';

interface ResolvedTelegramContext {
  tenantId: string;
  userId?: string;
}

@Injectable()
export class TelegramUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramUpdate.name);
  private readonly pendingActions = new Map<number, { action: PendingTelegramAction; expiresAt: number }>();
  private pilotTenantId?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
    private readonly agentService: AgentService,
    private readonly calendarService: CalendarService,
    private readonly deadlinesService: DeadlinesService,
    private readonly casesService: CasesService,
    private readonly tasksService: TasksService,
    private readonly tenantsService: TenantsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const bot = this.telegramService.bot;
    if (!bot) {
      return;
    }

    bot.start((ctx) => this.wrap(ctx, () => this.handleStart(ctx)));
    bot.command('today', (ctx) => this.wrap(ctx, () => this.handleToday(ctx)));
    bot.command('week', (ctx) => this.wrap(ctx, () => this.handleWeek(ctx)));
    bot.command('deadline', (ctx) => this.wrap(ctx, () => this.handleDeadlineCreate(ctx)));
    bot.command('case', (ctx) => this.wrap(ctx, () => this.handleCaseCreate(ctx)));
    bot.command('task', (ctx) => this.wrap(ctx, () => this.handleTaskCreate(ctx)));
    bot.command('status', (ctx) => this.wrap(ctx, () => this.handleStatus(ctx)));
    bot.command('help', (ctx) => this.wrap(ctx, () => this.handleHelp(ctx)));
    bot.on('text', (ctx) => this.wrap(ctx, () => this.handleFreeText(ctx)));
  }

  private async handleStart(ctx: TelegramContext) {
    const { tenantId } = await this.resolveTelegramContext(ctx);
    const brief = await this.buildDailyBrief(tenantId);

    await this.reply(
      ctx,
      [
        '👋 *BooratramG4 онлайн*',
        '',
        brief,
        '',
        'Напиши любой вопрос или используй команды:',
        '/today /week /deadline /case /task /status /help',
      ].join('\n'),
    );
  }

  private async handleToday(ctx: TelegramContext) {
    const { tenantId } = await this.resolveTelegramContext(ctx);
    await this.typing(ctx);
    await this.reply(ctx, await this.buildDailyBrief(tenantId));
  }

  private async handleWeek(ctx: TelegramContext) {
    const { tenantId } = await this.resolveTelegramContext(ctx);
    await this.typing(ctx);

    const [events, deadlines] = await Promise.all([
      this.calendarService.getUpcomingEvents(tenantId, 7),
      this.deadlinesService.getUpcoming(tenantId, 7),
    ]);

    await this.reply(ctx, formatWeekPlan(events, deadlines));
  }

  private async handleDeadlineCreate(ctx: TelegramContext) {
    const text = this.commandPayload(ctx, 'deadline');
    if (!text) {
      await this.reply(
        ctx,
        [
          '📅 *Формат дедлайна*',
          '',
          '`/deadline Название | 2026-03-20 18:00 | projectId`',
          '',
          'Пример:',
          '`/deadline Деплой ai-publisher | 2026-03-20 18:00 | ai-publisher`',
        ].join('\n'),
      );
      return;
    }

    const [title, dueAtInput, projectId] = text.split('|').map((item) => item.trim());
    if (!title || !dueAtInput) {
      await this.reply(ctx, 'Нужны как минимум название и дата: `/deadline Название | 2026-03-20 18:00`');
      return;
    }

    const parsedDueAt = this.parseDateInput(dueAtInput);
    if (!parsedDueAt) {
      await this.reply(ctx, 'Не удалось разобрать дату. Используй формат `YYYY-MM-DD HH:mm`.');
      return;
    }

    const { tenantId } = await this.resolveTelegramContext(ctx);
    await this.typing(ctx);
    const created = await this.deadlinesService.create(tenantId, {
      title,
      dueAt: parsedDueAt.toISOString(),
      projectId: projectId || undefined,
    });

    await this.reply(
      ctx,
      `✅ *Дедлайн создан*\n\n*${title}*\nСрок: ${parsedDueAt.toLocaleString('ru-RU')}\nЗапланировано алертов: ${created.schedule.scheduledCount}`,
    );
  }

  private async handleCaseCreate(ctx: TelegramContext) {
    const inlinePayload = this.commandPayload(ctx, 'case');
    if (inlinePayload) {
      await this.createCaseFromText(ctx, inlinePayload);
      return;
    }

    this.setPendingAction(ctx, 'case');
    await this.reply(
      ctx,
      [
        '📚 *Новый кейс*',
        '',
        'Пришли следующим сообщением либо формат:',
        '`title | context | problem | solution | lessons`',
        '',
        'Либо просто опиши кейс свободным текстом, я сохраню его как raw case draft.',
      ].join('\n'),
    );
  }

  private async handleTaskCreate(ctx: TelegramContext) {
    const inlinePayload = this.commandPayload(ctx, 'task');
    if (inlinePayload) {
      await this.createTaskFromText(ctx, inlinePayload);
      return;
    }

    this.setPendingAction(ctx, 'task');
    await this.reply(
      ctx,
      [
        '🧩 *Новая задача*',
        '',
        'Пришли следующим сообщением либо формат:',
        '`title | 2026-03-20 18:00 | tag1,tag2`',
        '',
        'Либо просто название задачи одной строкой.',
      ].join('\n'),
    );
  }

  private async handleStatus(ctx: TelegramContext) {
    const resolved = await this.resolveTelegramContext(ctx);
    await this.typing(ctx);
    const response = await this.agentService.chat(
      resolved.tenantId,
      'Дай краткий статус всех активных проектов, дедлайнов и задач в формате ежедневного апдейта.',
      [],
      Channel.TELEGRAM,
      resolved.userId,
    );

    await this.reply(ctx, response.content);
  }

  private async handleHelp(ctx: TelegramContext) {
    await this.reply(
      ctx,
      [
        '*BooratramG4 — команды:*',
        '',
        '`/today` — план на сегодня',
        '`/week` — план на неделю',
        '`/deadline` — создать дедлайн',
        '`/case` — зафиксировать кейс',
        '`/task` — создать задачу',
        '`/status` — статус проектов',
        '`/help` — помощь',
        '',
        '_Любой текст без команды = разговор с G4_',
      ].join('\n'),
    );
  }

  private async handleFreeText(ctx: TelegramContext) {
    const message = ctx.message?.text?.trim();
    if (!message || message.startsWith('/')) {
      return;
    }

    const pending = this.getPendingAction(ctx);
    if (pending === 'case') {
      this.clearPendingAction(ctx);
      await this.createCaseFromText(ctx, message);
      return;
    }

    if (pending === 'task') {
      this.clearPendingAction(ctx);
      await this.createTaskFromText(ctx, message);
      return;
    }

    const resolved = await this.resolveTelegramContext(ctx);
    await this.typing(ctx);
    const response = await this.agentService.chat(
      resolved.tenantId,
      message,
      [],
      Channel.TELEGRAM,
      resolved.userId,
    );

    await this.reply(ctx, response.content);
  }

  private async createCaseFromText(ctx: TelegramContext, text: string) {
    const { tenantId } = await this.resolveTelegramContext(ctx);
    const parts = text.split('|').map((item) => item.trim()).filter(Boolean);

    const dto = parts.length >= 4
      ? {
          title: parts[0],
          context: parts[1],
          problem: parts[2],
          solution: parts[3],
          lessons: parts[4],
          tags: ['telegram'],
          category: 'OPERATIONS' as const,
        }
      : {
          title: text.slice(0, 80),
          context: text,
          problem: text,
          solution: 'Зафиксировано из Telegram. Требует структурирования.',
          lessons: text,
          tags: ['telegram', 'raw-case'],
          category: 'OPERATIONS' as const,
        };

    const created = await this.casesService.create(tenantId, dto);
    await this.reply(ctx, `✅ Кейс сохранён: *${created.title}*`);
  }

  private async createTaskFromText(ctx: TelegramContext, text: string) {
    const { tenantId } = await this.resolveTelegramContext(ctx);
    const parts = text.split('|').map((item) => item.trim());
    const title = parts[0];
    const dueAt = parts[1] ? this.parseDateInput(parts[1]) : null;
    const tags = parts[2]
      ? parts[2].split(',').map((item) => item.trim()).filter(Boolean)
      : ['telegram'];

    const created = await this.tasksService.create(tenantId, {
      title,
      dueAt: dueAt?.toISOString(),
      tags,
    });

    await this.reply(ctx, `✅ Задача создана: *${created.title}*`);
  }

  private async resolveTelegramContext(ctx: TelegramContext): Promise<ResolvedTelegramContext> {
    const telegramId = ctx.from?.id ? String(ctx.from.id) : undefined;
    if (telegramId) {
      const user = await this.prisma.user.findFirst({
        where: {
          telegramId,
          isActive: true,
        },
        select: {
          id: true,
          tenantId: true,
        },
      });

      if (user) {
        return {
          tenantId: user.tenantId,
          userId: user.id,
        };
      }
    }

    return {
      tenantId: await this.getPilotTenantId(),
    };
  }

  private async getPilotTenantId() {
    if (this.pilotTenantId) {
      return this.pilotTenantId;
    }

    const configured = this.configService.get<string>('PILOT_TENANT_ID')?.trim();
    if (configured) {
      const tenantById = await this.prisma.tenant.findUnique({
        where: { id: configured },
        select: { id: true },
      });

      if (tenantById) {
        this.pilotTenantId = tenantById.id;
        return tenantById.id;
      }

      this.logger.warn(`Configured PILOT_TENANT_ID=${configured} was not found; falling back to slug lookup`);
    }

    const slug = this.configService.get<string>('PILOT_TENANT_SLUG', 'bg-studio-ai');
    const tenant = await this.tenantsService.findBySlug(slug);
    this.pilotTenantId = tenant.id;
    return tenant.id;
  }

  private async buildDailyBrief(tenantId: string) {
    const [events, urgentDeadlines] = await Promise.all([
      this.calendarService.getEventsForToday(tenantId),
      this.deadlinesService.getUrgent(tenantId),
    ]);

    return formatDailyBrief(events, urgentDeadlines);
  }

  private commandPayload(ctx: TelegramContext, command: string) {
    const text = ctx.message?.text ?? '';
    return text.replace(new RegExp(`^/${command}(?:@\\w+)?`, 'i'), '').trim();
  }

  private parseDateInput(value: string) {
    const normalized = value.trim().replace(' ', 'T');
    const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
    const date = new Date(withSeconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private setPendingAction(ctx: TelegramContext, action: PendingTelegramAction) {
    if (!ctx.from?.id) {
      return;
    }

    this.pendingActions.set(ctx.from.id, {
      action,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }

  private getPendingAction(ctx: TelegramContext) {
    if (!ctx.from?.id) {
      return null;
    }

    const pending = this.pendingActions.get(ctx.from.id);
    if (!pending) {
      return null;
    }

    if (pending.expiresAt <= Date.now()) {
      this.pendingActions.delete(ctx.from.id);
      return null;
    }

    return pending.action;
  }

  private clearPendingAction(ctx: TelegramContext) {
    if (ctx.from?.id) {
      this.pendingActions.delete(ctx.from.id);
    }
  }

  private async typing(ctx: TelegramContext) {
    if (this.telegramService.getStatus().remoteApiDisabled) {
      return;
    }

    try {
      await ctx.sendChatAction('typing');
    } catch {
      // Ignore chat action errors.
    }
  }

  private async reply(ctx: TelegramContext, text: string) {
    const chatId = ctx.chat?.id;
    if (chatId) {
      const sent = await this.telegramService.sendMessage(chatId, text);
      if (sent) {
        return;
      }
    }

    try {
      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(plainTextFallback(text));
    }
  }

  private async wrap(ctx: TelegramContext, handler: () => Promise<void>) {
    try {
      await handler();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      await this.reply(ctx, 'Сервис временно недоступен. Попробуй ещё раз.');
    }
  }
}
