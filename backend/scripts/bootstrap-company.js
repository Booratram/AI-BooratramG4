const argon2 = require('argon2');
const { Plan, PrismaClient, TenantStatus, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();

const transliterationMap = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function readEnv(name, fallback = '') {
  const raw = process.env[name];
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value || fallback;
}

function readRequiredEnv(name) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function transliterate(value) {
  return value
    .toLowerCase()
    .split('')
    .map((char) => transliterationMap[char] ?? char)
    .join('');
}

function toSlug(value) {
  return transliterate(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function deriveCompanySlug(companyName) {
  const explicitSlug = readEnv('COMPANY_TENANT_SLUG');
  const derivedSlug = explicitSlug || toSlug(companyName);

  if (!derivedSlug) {
    throw new Error('Unable to derive tenant slug from COMPANY_NAME. Set COMPANY_TENANT_SLUG explicitly.');
  }

  return derivedSlug;
}

function normalizePlan(value) {
  const normalized = String(value || 'PILOT').trim().toUpperCase();
  return Plan[normalized] ? normalized : 'PILOT';
}

function buildDefaults(companyName, industry) {
  return {
    brainPersona: `AI-операционный ассистент компании ${companyName}. Отвечай конкретно, по делу и с опорой на данные компании.`,
    brainContext: `${companyName} использует BooratramG4 как внутренний AI-центр для задач, дедлайнов, кейсов, знаний и управленческих решений. Сфера компании: ${industry}.`,
  };
}

async function upsertTenantAdmin(tenantId, email, name, password, telegramId) {
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
      password: hash,
      telegramId: telegramId || null,
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    },
    create: {
      tenantId,
      email,
      name,
      password: hash,
      telegramId: telegramId || null,
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    },
  });
}

async function main() {
  const companyName = readRequiredEnv('COMPANY_NAME');
  const companyIndustry = readEnv('COMPANY_INDUSTRY', 'Business services');
  const companyLanguage = readEnv('COMPANY_LANGUAGE', 'ru');
  const companySlug = deriveCompanySlug(companyName);
  const companyPlan = normalizePlan(readEnv('COMPANY_PLAN', 'PILOT'));
  const adminName = readEnv('COMPANY_ADMIN_NAME', 'Company Admin');
  const adminEmail = readRequiredEnv('COMPANY_ADMIN_EMAIL');
  const adminPassword = readRequiredEnv('COMPANY_ADMIN_PASSWORD');
  const adminTelegramId = readEnv('COMPANY_ADMIN_TELEGRAM_ID');
  const brainName = readEnv('COMPANY_BRAIN_NAME', 'G4');
  const telegramBotToken = readEnv('COMPANY_TELEGRAM_BOT_TOKEN');
  const defaults = buildDefaults(companyName, companyIndustry);
  const brainPersona = readEnv('COMPANY_BRAIN_PERSONA', defaults.brainPersona);
  const brainContext = readEnv('COMPANY_BRAIN_CONTEXT', defaults.brainContext);

  const tenant = await prisma.tenant.upsert({
    where: { slug: companySlug },
    update: {
      name: companyName,
      industry: companyIndustry,
      plan: companyPlan,
      status: TenantStatus.ACTIVE,
      language: companyLanguage,
      brainName,
      brainPersona,
      brainContext,
      telegramBotToken: telegramBotToken || null,
    },
    create: {
      slug: companySlug,
      name: companyName,
      industry: companyIndustry,
      plan: companyPlan,
      status: TenantStatus.ACTIVE,
      language: companyLanguage,
      brainName,
      brainPersona,
      brainContext,
      telegramBotToken: telegramBotToken || null,
    },
  });

  const admin = await upsertTenantAdmin(
    tenant.id,
    adminEmail,
    adminName,
    adminPassword,
    adminTelegramId,
  );

  console.log('Company bootstrap completed');
  console.log(`tenantId=${tenant.id}`);
  console.log(`tenantSlug=${tenant.slug}`);
  console.log(`tenantName=${tenant.name}`);
  console.log(`adminEmail=${admin.email}`);
  console.log(`adminRole=${admin.role}`);
  console.log('Login with email + password + tenant slug on /login');

  const pilotSlug = process.env.PILOT_TENANT_SLUG?.trim();
  if (pilotSlug && pilotSlug !== tenant.slug) {
    console.log(`Warning: PILOT_TENANT_SLUG is '${pilotSlug}'. For Telegram fallback and pilot flows you may want '${tenant.slug}'.`);
  }
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  });