import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { DeadlineStatus } from '@prisma/client';
import { Job } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { formatAlertMessage } from '../telegram/telegram.helpers';
import { DeadlineAlertJobData } from './deadline-scheduler.service';

@Processor('deadline-alerts')
export class DeadlineAlertProcessor {
  private readonly logger = new Logger(DeadlineAlertProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  @Process('alert')
  async handleAlert(job: Job<DeadlineAlertJobData>) {
    const { deadlineId, tenantId, minutesBefore } = job.data;
    this.logger.log(`Processing alert job ${job.id} for deadline ${deadlineId}`);

    const deadline = await this.prisma.deadline.findUnique({
      where: { id: deadlineId },
    });

    if (!deadline) {
      this.logger.warn(`Deadline ${deadlineId} not found, skipping alert`);
      return { skipped: true, reason: 'missing_deadline' };
    }

    if (
      deadline.status === DeadlineStatus.COMPLETED ||
      deadline.status === DeadlineStatus.CANCELLED
    ) {
      this.logger.log(`Deadline ${deadlineId} already closed with status ${deadline.status}`);
      return { skipped: true, reason: 'closed_deadline' };
    }

    if (deadline.dueAt.getTime() <= Date.now() && deadline.status !== DeadlineStatus.OVERDUE) {
      await this.prisma.deadline.update({
        where: { id: deadline.id },
        data: { status: DeadlineStatus.OVERDUE },
      });
      deadline.status = DeadlineStatus.OVERDUE;
    }

    const alertText = formatAlertMessage(deadline, minutesBefore);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        telegramId: { not: null },
      },
      select: {
        telegramId: true,
      },
    });

    let delivered = 0;
    if (users.length === 0) {
      delivered = (await this.telegramService.alertOwner(alertText)) ? 1 : 0;
    } else {
      const results = await Promise.all(
        users.map((user) => this.telegramService.sendMessage(user.telegramId!, alertText)),
      );
      delivered = results.filter(Boolean).length;
    }

    this.logger.log(
      `Alert delivered for deadline ${deadline.title}; recipients=${delivered}; minutesBefore=${minutesBefore}`,
    );

    return {
      delivered,
      deadlineId,
      tenantId,
    };
  }
}
