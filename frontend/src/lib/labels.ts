const projectStatusLabels: Record<string, string> = {
  ACTIVE: 'Активный',
  PAUSED: 'На паузе',
  COMPLETED: 'Завершен',
  ARCHIVED: 'Архив',
  'In build': 'В разработке',
  Deploy: 'Деплой',
  Running: 'В работе',
};

const tenantStatusLabels: Record<string, string> = {
  ONBOARDING: 'Онбординг',
  ACTIVE: 'Активен',
  SUSPENDED: 'Приостановлен',
  CHURNED: 'Закрыт',
};

const planLabels: Record<string, string> = {
  PILOT: 'Пилот',
  STARTER: 'Старт',
  BUSINESS: 'Бизнес',
  ENTERPRISE: 'Корпоративный',
};

const caseCategoryLabels: Record<string, string> = {
  TECHNICAL: 'Технический',
  BUSINESS: 'Бизнес',
  OPERATIONS: 'Операционный',
  PRODUCT: 'Продуктовый',
  SALES: 'Продажи',
  MARKETING: 'Маркетинг',
  FINANCE: 'Финансы',
  TEAM: 'Команда',
  CLIENT: 'Клиентский',
  CRISIS: 'Кризис',
  MISTAKE: 'Ошибка',
  WIN: 'Успех',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критичный',
  Low: 'Низкий',
  Medium: 'Средний',
  High: 'Высокий',
  Critical: 'Критичный',
};

const eventTypeLabels: Record<string, string> = {
  GENERAL: 'Общее',
  MEETING: 'Встреча',
  DEADLINE: 'Дедлайн',
  LAUNCH: 'Запуск',
  REVIEW: 'Ревью',
  PERSONAL: 'Личное',
  Review: 'Ревью',
  Meeting: 'Встреча',
  'Work block': 'Фокус-блок',
};

const embeddingModeLabels: Record<string, string> = {
  openai: 'OpenAI',
  deterministic: 'Локальный fallback',
  auto: 'Авто',
};

function mapLabel(dictionary: Record<string, string>, value?: string) {
  if (!value) {
    return 'Не указано';
  }

  return dictionary[value] ?? value;
}

export function translateProjectStatus(value?: string) {
  return mapLabel(projectStatusLabels, value);
}

export function translateTenantStatus(value?: string) {
  return mapLabel(tenantStatusLabels, value);
}

export function translatePlan(value?: string) {
  return mapLabel(planLabels, value);
}

export function translateCaseCategory(value?: string) {
  return mapLabel(caseCategoryLabels, value);
}

export function translatePriority(value?: string) {
  return mapLabel(priorityLabels, value);
}

export function translateEventType(value?: string) {
  return mapLabel(eventTypeLabels, value);
}

export function translateEmbeddingMode(value?: string) {
  return mapLabel(embeddingModeLabels, value);
}