import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Deadline } from '@prisma/client';
import { Queue } from 'bull';

export const ALERT_OFFSETS = [
  { minutes: 7 * 24 * 60, label: '7 дней' },
  { minutes: 3 * 24 * 60, label: '3 дня' },
  { minutes: 24 * 60, label: '1 день' },
  { minutes: 2 * 60, label: '2 часа' },
  { minutes: 30, label: '30 минут' },
];

export interface DeadlineAlertJobData {
  deadlineId: string;
  tenantId: string;
  minutesBefore: number;
  label: string;
  deadlineTitle: string;
  dueAt: string;
}

@Injectable()
export class DeadlineSchedulerService {
  private readonly logger = new Logger(DeadlineSchedulerService.name);

  constructor(@InjectQueue('deadline-alerts') private readonly alertQueue: Queue<DeadlineAlertJobData>) {}

  async scheduleAlerts(deadline: Deadline) {
    const dueAt = new Date(deadline.dueAt);
    const now = new Date();
    const scheduledLabels: string[] = [];

    for (const offset of ALERT_OFFSETS) {
      const alertAt = new Date(dueAt.getTime() - offset.minutes * 60_000);
      if (alertAt <= now) {
        continue;
      }

      const scheduled = await this.enqueueAlert(deadline, offset.minutes, offset.label, alertAt);
      if (scheduled) {
        scheduledLabels.push(offset.label);
      }
    }

    if (scheduledLabels.length === 0 && dueAt > now) {
      const scheduled = await this.enqueueAlert(deadline, 0, 'в срок', dueAt);
      if (scheduled) {
        scheduledLabels.push('в срок');
      }
    }

    return {
      scheduledCount: scheduledLabels.length,
      scheduledLabels,
    };
  }

  async cancelAlerts(deadlineId: string) {
    const jobs = await this.alertQueue.getJobs(['delayed', 'waiting', 'paused']);
    const matchingJobs = jobs.filter((job) => job.data?.deadlineId === deadlineId);
    await Promise.all(matchingJobs.map((job) => job.remove()));

    this.logger.log(`Cancelled ${matchingJobs.length} queued alerts for deadline ${deadlineId}`);
    return { removed: matchingJobs.length };
  }

  async getQueueStats() {
    const [delayed, waiting, active, completed, failed] = await Promise.all([
      this.alertQueue.getDelayedCount(),
      this.alertQueue.getWaitingCount(),
      this.alertQueue.getActiveCount(),
      this.alertQueue.getCompletedCount(),
      this.alertQueue.getFailedCount(),
    ]);

    return { delayed, waiting, active, completed, failed };
  }

  private async enqueueAlert(
    deadline: Deadline,
    minutesBefore: number,
    label: string,
    runAt: Date,
  ) {
    const delay = runAt.getTime() - Date.now();
    if (delay <= 0) {
      return false;
    }

    const jobId = `deadline:${deadline.id}:${minutesBefore}`;
    await this.alertQueue.add(
      'alert',
      {
        deadlineId: deadline.id,
        tenantId: deadline.tenantId,
        minutesBefore,
        label,
        deadlineTitle: deadline.title,
        dueAt: deadline.dueAt.toISOString(),
      },
      {
        delay,
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(
      `Scheduled alert for "${deadline.title}" (${label}) at ${runAt.toISOString()}`,
    );
    return true;
  }
}
