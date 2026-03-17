import { CalendarEvent, Deadline, Priority } from '@prisma/client';

const PRIORITY_EMOJI: Record<Priority, string> = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  CRITICAL: '🔴',
};

export function formatDailyBrief(events: CalendarEvent[], deadlines: Deadline[]) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const lines = [`📅 *${dateLabel}*`, ''];

  if (deadlines.length > 0) {
    lines.push('⚡ *Срочно:*');
    deadlines.forEach((deadline) => {
      const emoji = deadline.status === 'OVERDUE' ? '🚨' : PRIORITY_EMOJI[deadline.priority];
      lines.push(`${emoji} ${escapeMarkdown(deadline.title)} — ${formatTimeLeft(deadline.dueAt)}`);
    });
    lines.push('');
  }

  if (events.length > 0) {
    lines.push('🗓 *Сегодня:*');
    events.forEach((event) => {
      const time = new Date(event.startAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      lines.push(`• ${time} — ${escapeMarkdown(event.title)}`);
    });
  } else {
    lines.push('🗓 Событий на сегодня нет');
  }

  return lines.join('\n');
}

export function formatWeekPlan(events: CalendarEvent[], deadlines: Deadline[]) {
  const grouped = groupByDay([...events, ...deadlines]);
  const keys = Object.keys(grouped);

  if (keys.length === 0) {
    return '📆 *План на неделю*\n\nНичего не запланировано';
  }

  const lines = ['📆 *План на неделю*', ''];
  keys.forEach((key) => {
    lines.push(`*${key}*`);
    grouped[key].forEach((item) => {
      const isDeadline = 'dueAt' in item;
      const emoji = isDeadline ? PRIORITY_EMOJI[item.priority] : '📌';
      lines.push(`${emoji} ${escapeMarkdown(item.title)}`);
    });
    lines.push('');
  });

  return lines.join('\n').trim();
}

export function formatDeadlines(deadlines: Deadline[]) {
  if (deadlines.length === 0) {
    return '✅ Срочных дедлайнов нет';
  }

  return deadlines
    .map((deadline) => {
      const emoji = deadline.status === 'OVERDUE' ? '🚨' : PRIORITY_EMOJI[deadline.priority];
      return `${emoji} *${escapeMarkdown(deadline.title)}* — ${formatTimeLeft(deadline.dueAt)}`;
    })
    .join('\n');
}

export function formatAlertMessage(deadline: Deadline, minutesBefore: number) {
  const lead =
    minutesBefore === 0 ? 'Срок наступил' : `Осталось: ${formatMinutes(minutesBefore)}`;

  return [
    minutesBefore <= 30 ? '🚨 *Напоминание о дедлайне*' : '📌 *Напоминание о дедлайне*',
    '',
    `*${escapeMarkdown(deadline.title)}*`,
    lead,
    `Срок: ${new Date(deadline.dueAt).toLocaleString('ru-RU')}`,
  ].join('\n');
}

export function plainTextFallback(text: string) {
  return text.replace(/[*_`]/g, '');
}

function formatTimeLeft(dueAt: Date | string) {
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff <= 0) {
    return 'срок наступил';
  }

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ч`;
  }

  return `${Math.floor(hours / 24)} д`;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} минут`;
  }

  if (minutes < 24 * 60) {
    return `${Math.floor(minutes / 60)} часов`;
  }

  return `${Math.floor(minutes / (24 * 60))} дней`;
}

function groupByDay(items: Array<CalendarEvent | Deadline>) {
  return items.reduce<Record<string, Array<CalendarEvent | Deadline>>>((groups, item) => {
    const date = new Date('startAt' in item ? item.startAt : item.dueAt);
    const key = date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function escapeMarkdown(value: string) {
  return value.replace(/([*_`\[])/g, '\\$1');
}
