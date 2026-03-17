import { Injectable } from '@nestjs/common';

interface DeadlineAlertInput {
  title: string;
  dueAt: Date;
  priority: string;
}

@Injectable()
export class NotificationsService {
  sendTelegram(tenantId: string, message: string) {
    return {
      tenantId,
      channel: 'telegram',
      message,
      status: 'queued',
    };
  }

  sendEmail(tenantId: string, subject: string, body: string) {
    return {
      tenantId,
      channel: 'email',
      subject,
      body,
      status: 'queued',
    };
  }

  sendDeadlineAlert(tenantId: string, input: DeadlineAlertInput) {
    const message = `Дедлайн: ${input.title}. Срок: ${input.dueAt.toISOString()}. Приоритет: ${input.priority}.`;
    return this.sendTelegram(tenantId, message);
  }
}
