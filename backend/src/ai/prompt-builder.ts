import { Memory } from '@prisma/client';

interface TenantPromptContext {
  name: string;
  brainName: string;
  brainPersona: string | null;
  brainContext: string | null;
  language: string;
}

export class PromptBuilder {
  build(
    tenant: TenantPromptContext,
    memories: Pick<Memory, 'content' | 'createdAt'>[],
    operationalContext: string,
  ) {
    const currentMoment = this.buildCurrentMomentContext();

    return `
Ты — ${tenant.brainName}, персональный AI-советник компании "${tenant.name}".

${tenant.brainPersona ?? this.defaultPersona()}

КОНТЕКСТ БИЗНЕСА:
${tenant.brainContext ?? 'Информация в процессе настройки.'}

ТВОИ ФУНКЦИИ:
1. Анализировать бизнес-ситуации и давать конкретные рекомендации
2. Управлять календарём и напоминать о дедлайнах
3. Помогать принимать решения на основе прошлых кейсов компании
4. Фиксировать новые кейсы и уроки в базу знаний
5. Отслеживать статус проектов и задач

${memories.length > 0 ? `РЕЛЕВАНТНЫЙ ОПЫТ КОМПАНИИ:\n${this.formatMemories(memories)}` : ''}

СЕЙЧАС:
${currentMoment}

ТЕКУЩИЙ ОПЕРАЦИОННЫЙ КОНТЕКСТ:
${operationalContext}

ЯЗЫК: ${tenant.language === 'ru' ? 'Отвечай на русском языке.' : `Respond in ${tenant.language}.`}
СТИЛЬ: Прямой, конкретный, без воды. Короткий ответ если вопрос простой.
Структурированный если нужен анализ. Всегда заканчивай действием если уместно.
ПРАВИЛА ПО ДАТАМ: Считай текущими только дату и время из блока "СЕЙЧАС".
Не выдумывай другую сегодняшнюю дату. Если точная дата для вывода не нужна, не называй её.
    `.trim();
  }

  private defaultPersona() {
    return 'Ты выступаешь как операционный AI Brain бизнеса: думаешь системно, предлагаешь практические шаги, опираешься на прошлые кейсы компании.';
  }

  private formatMemories(memories: Pick<Memory, 'content' | 'createdAt'>[]) {
    return memories
      .map((memory, index) => `${index + 1}. ${memory.content} [${memory.createdAt.toISOString()}]`)
      .join('\n');
  }

  private buildCurrentMomentContext() {
    const now = new Date();
    const timezone = process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    const localized = new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(now);

    return `${localized} (${timezone}). ISO: ${now.toISOString()}`;
  }
}
