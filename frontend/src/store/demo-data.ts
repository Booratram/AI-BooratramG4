export const dashboardMetrics = [
  { label: 'AI requests', value: '891', hint: 'С начала пилота' },
  { label: 'Active projects', value: '4', hint: 'BG Site, ai-publisher, Gogigo, G4' },
  { label: 'Open deadlines', value: '3', hint: '1 из них критический' },
  { label: 'Cases in memory', value: '42', hint: 'Пилотный knowledge base' },
];

export const deadlines = [
  { title: 'ai-publisher deploy', due: 'Сегодня, 18:00', priority: 'Critical', note: 'На прошлом деплое блокером был python-dotenv' },
  { title: 'G4 tenant auth review', due: 'Завтра, 13:00', priority: 'High', note: 'Проверить изоляцию SUPER_ADMIN vs TENANT_ADMIN' },
  { title: 'BG Studio pitch deck', due: 'Через 2 дня', priority: 'Medium', note: 'Добавить кейс VK OAuth в sales narrative' },
];

export const projects = [
  { name: 'BooratramG4', status: 'In build', summary: 'Multi-tenant AI platform foundation', progress: '35%' },
  { name: 'ai-publisher', status: 'Deploy', summary: 'VK publishing flow and infra hardening', progress: '78%' },
  { name: 'Gogigo', status: 'Running', summary: 'Telegram AI already in production mode', progress: '92%' },
];

export const brainMessages = [
  { role: 'assistant', text: 'Сегодня у тебя 3 зоны внимания: деплой ai-publisher, tenant auth в G4 и упаковка кейсов для продаж.' },
  { role: 'user', text: 'Что критично на ближайшие 4 часа?' },
  { role: 'assistant', text: '1. Проверить деплой pipeline. 2. Зафиксировать tenant guard regression tests. 3. Подготовить один продающий кейс на базе VK OAuth.' },
];

export const cases = [
  { title: 'VK OAuth: неправильный тип приложения', category: 'TECHNICAL', impact: 7, lesson: 'Для server-side сценария VK app должен быть Standalone.' },
  { title: 'python-dotenv блокировал запуск systemd', category: 'OPERATIONS', impact: 6, lesson: 'Проверять зависимости до деплоя и держать список пакетов актуальным.' },
  { title: 'DeepSeek стабилен на русском', category: 'TECHNICAL', impact: 9, lesson: 'Русскоязычный продукт можно строить без отдельного fine-tuning.' },
];

export const knowledgeHits = [
  { title: 'VK OAuth fix memory', similarity: '0.93', summary: 'OAuth token issue was solved by switching VK app type to Standalone.' },
  { title: 'Systemd deploy blocker', similarity: '0.81', summary: 'Missing python-dotenv in the active environment prevented startup.' },
  { title: 'DeepSeek RU quality', similarity: '0.78', summary: 'DeepSeek handled Russian system prompts without quality loss.' },
];

export const adminTenants = [
  { id: 'bg-studio-ai', name: 'BG Studio AI', plan: 'PILOT', status: 'ACTIVE', cases: 42, memories: 891, users: 3 },
  { id: 'aragvi', name: 'Restaurant Aragvi', plan: 'BUSINESS', status: 'ONBOARDING', cases: 8, memories: 28, users: 5 },
  { id: 'clinic-n', name: 'Clinic N', plan: 'STARTER', status: 'ACTIVE', cases: 13, memories: 102, users: 4 },
];

export const onboardingSteps = [
  'Создать тенанта и выбрать план',
  'Настроить имя, контекст и persona AI Brain',
  'Провести интервью и засеять первые кейсы',
  'Подключить календарь и Telegram',
  'Запустить первый daily briefing',
];
