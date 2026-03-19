export const dashboardMetrics = [
  { label: 'AI-запросы', value: '891', hint: 'С начала пилота' },
  { label: 'Активные проекты', value: '4', hint: 'BG Site, ai-publisher, Gogigo, G4' },
  { label: 'Открытые дедлайны', value: '3', hint: '1 из них критический' },
  { label: 'Кейсы в памяти', value: '42', hint: 'Пилотная база знаний' },
];

export const deadlines = [
  { title: 'ai-publisher deploy', due: 'Сегодня, 18:00', priority: 'Критичный', note: 'На прошлом деплое блокером был python-dotenv' },
  { title: 'Ревью tenant auth в G4', due: 'Завтра, 13:00', priority: 'Высокий', note: 'Проверить изоляцию ролей SUPER_ADMIN и TENANT_ADMIN' },
  { title: 'Презентация BG Studio', due: 'Через 2 дня', priority: 'Средний', note: 'Добавить кейс VK OAuth в продающий narrative' },
];

export const projects = [
  { name: 'BooratramG4', status: 'В разработке', summary: 'Основа multi-tenant AI-платформы', progress: '35%' },
  { name: 'ai-publisher', status: 'Деплой', summary: 'Поток публикации в VK и усиление инфраструктуры', progress: '78%' },
  { name: 'Gogigo', status: 'В работе', summary: 'Telegram AI уже работает в боевом режиме', progress: '92%' },
];

export const brainMessages = [
  { role: 'assistant', text: 'Сегодня у тебя 3 зоны внимания: деплой ai-publisher, tenant auth в G4 и упаковка кейсов для продаж.' },
  { role: 'user', text: 'Что критично на ближайшие 4 часа?' },
  { role: 'assistant', text: '1. Проверить деплойный pipeline. 2. Зафиксировать регрессионные тесты tenant guard. 3. Подготовить один продающий кейс на базе VK OAuth.' },
];

export const cases = [
  { title: 'VK OAuth: неправильный тип приложения', category: 'Технический', impact: 7, lesson: 'Для server-side сценария VK app должен быть Standalone.' },
  { title: 'python-dotenv блокировал запуск systemd', category: 'Операционный', impact: 6, lesson: 'Проверять зависимости до деплоя и держать список пакетов актуальным.' },
  { title: 'DeepSeek стабилен на русском', category: 'Технический', impact: 9, lesson: 'Русскоязычный продукт можно строить без отдельного fine-tuning.' },
];

export const knowledgeHits = [
  { title: 'Исправление VK OAuth', similarity: '0.93', summary: 'Проблема с OAuth token была решена сменой типа VK-приложения на Standalone.' },
  { title: 'Блокер systemd деплоя', similarity: '0.81', summary: 'Отсутствие python-dotenv в активном окружении мешало запуску сервиса.' },
  { title: 'Качество DeepSeek на русском', similarity: '0.78', summary: 'DeepSeek уверенно отрабатывал русские системные промпты без деградации качества.' },
];

export const adminTenants = [
  { id: 'bg-studio-ai', name: 'BG Studio AI', plan: 'Пилот', status: 'Активен', cases: 42, memories: 891, users: 3 },
  { id: 'aragvi', name: 'Restaurant Aragvi', plan: 'Бизнес', status: 'Онбординг', cases: 8, memories: 28, users: 5 },
  { id: 'clinic-n', name: 'Clinic N', plan: 'Старт', status: 'Активен', cases: 13, memories: 102, users: 4 },
];

export const onboardingSteps = [
  'Создать тенанта и выбрать тариф',
  'Настроить имя, контекст и persona AI Brain',
  'Провести интервью и засеять первые кейсы',
  'Подключить календарь и Telegram',
  'Запустить первую ежедневную сводку',
];