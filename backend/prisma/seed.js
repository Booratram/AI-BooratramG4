const argon2 = require('argon2');
const {
  CaseCategory,
  MemorySource,
  Plan,
  PrismaClient,
  TenantStatus,
  UserRole,
} = require('@prisma/client');

const prisma = new PrismaClient();

const bgStudioSeedCases = [
  {
    title: 'VK OAuth: неправильный тип приложения',
    category: CaseCategory.TECHNICAL,
    context: 'Разработка ai-publisher, модуль публикации в VK',
    problem: 'VK OAuth не возвращал токен, запросы зависали',
    solution: 'Тип VK app изменён с Web на Standalone. App ID: 54473886',
    lessons: 'При VK OAuth всегда проверять тип приложения. Standalone подходит для server-side.',
    tags: ['vk', 'oauth', 'ai-publisher'],
    impact: 7,
  },
  {
    title: 'python-dotenv блокировал запуск systemd сервиса',
    category: CaseCategory.OPERATIONS,
    context: 'Деплой ai-publisher backend на VPS Timeweb (Ubuntu 22.04)',
    problem: 'Systemd сервис не стартовал из-за ModuleNotFoundError: python-dotenv',
    solution: 'Установлен python-dotenv в активированном venv и обновлён список зависимостей.',
    lessons: 'Перед деплоем нужно сверять зависимости и обновлять requirements.',
    tags: ['vps', 'python', 'systemd', 'deployment'],
    impact: 6,
  },
  {
    title: 'DeepSeek корректно работает с русским языком',
    category: CaseCategory.TECHNICAL,
    context: 'Настройка AI агента для Gogigo через Telegram',
    problem: 'Нужен был AI, который отвечает на русском без деградации качества',
    solution: 'DeepSeek с системным промптом на русском показал нативное качество без fine-tuning.',
    lessons: 'DeepSeek можно использовать как приоритетную модель для русскоязычных продуктов.',
    tags: ['deepseek', 'russian', 'telegram', 'gogigo'],
    impact: 9,
  },
];

async function upsertUser(tenantId, email, name, role, password) {
  const hash = await argon2.hash(password);

  return prisma.user.upsert({
    where: {
      email_tenantId: {
        email,
        tenantId,
      },
    },
    update: {
      name,
      role,
      password: hash,
      isActive: true,
    },
    create: {
      name,
      email,
      password: hash,
      role,
      tenantId,
      isActive: true,
    },
  });
}

async function main() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'alex@bg-studio.ai';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'change-me';
  const tenantSlug = process.env.PILOT_TENANT_SLUG ?? 'bg-studio-ai';
  const tenantName = process.env.PILOT_TENANT_NAME ?? 'BG Studio AI';
  const tenantLanguage = process.env.PILOT_TENANT_LANGUAGE ?? 'ru';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      name: tenantName,
      language: tenantLanguage,
      plan: Plan.PILOT,
      status: TenantStatus.ACTIVE,
      brainName: 'G4',
      brainPersona: 'AI-консультант IT-студии с прямым и конкретным стилем.',
      brainContext:
        'BG Studio AI создаёт AI-продукты, Telegram-ботов и SaaS-сервисы. Пилотный tenant используется для обучения на реальных кейсах студии.',
      telegramBotToken: process.env.PILOT_TELEGRAM_BOT_TOKEN || null,
    },
    create: {
      slug: tenantSlug,
      name: tenantName,
      industry: 'AI / IT studio',
      plan: Plan.PILOT,
      status: TenantStatus.ACTIVE,
      brainName: 'G4',
      brainPersona: 'AI-консультант IT-студии с прямым и конкретным стилем.',
      brainContext:
        'BG Studio AI создаёт AI-продукты, Telegram-ботов и SaaS-сервисы. Пилотный tenant используется для обучения на реальных кейсах студии.',
      language: tenantLanguage,
      telegramBotToken: process.env.PILOT_TELEGRAM_BOT_TOKEN || null,
    },
  });

  await upsertUser(tenant.id, adminEmail, 'Alex', UserRole.SUPER_ADMIN, adminPassword);
  await upsertUser(tenant.id, 'pilot-admin@bg-studio.ai', 'Pilot Admin', UserRole.TENANT_ADMIN, adminPassword);
  await upsertUser(tenant.id, 'member@bg-studio.ai', 'Pilot Member', UserRole.MEMBER, adminPassword);

  for (const seedCase of bgStudioSeedCases) {
    const existing = await prisma.case.findFirst({
      where: {
        tenantId: tenant.id,
        title: seedCase.title,
      },
    });

    if (existing) {
      continue;
    }

    const createdCase = await prisma.case.create({
      data: {
        ...seedCase,
        tenantId: tenant.id,
      },
    });

    await prisma.memory.create({
      data: {
        tenantId: tenant.id,
        caseId: createdCase.id,
        source: MemorySource.CASE,
        sourceId: createdCase.id,
        content: [
          createdCase.title,
          createdCase.context,
          createdCase.problem,
          createdCase.solution,
          createdCase.lessons,
        ]
          .filter(Boolean)
          .join(' | '),
        metadata: {
          seeded: true,
          impact: createdCase.impact,
          tags: createdCase.tags,
        },
      },
    });
  }

  console.log(`Seed completed for tenant ${tenant.slug}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
