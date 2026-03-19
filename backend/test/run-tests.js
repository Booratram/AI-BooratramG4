const assert = require('node:assert/strict');
const path = require('node:path');
const argon2 = require('argon2');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { UserRole } = require('@prisma/client');
const { AuthService } = require(path.resolve(__dirname, '../dist/src/auth/auth.service.js'));
const { TenantGuard } = require(path.resolve(__dirname, '../dist/src/tenants/tenant.guard.js'));
const { DeepseekService } = require(path.resolve(__dirname, '../dist/src/ai/deepseek.service.js'));
const { EmbeddingsService } = require(path.resolve(__dirname, '../dist/src/ai/embeddings.service.js'));
const { CalendarService } = require(path.resolve(__dirname, '../dist/src/calendar/calendar.service.js'));
const { DeadlineSchedulerService } = require(path.resolve(__dirname, '../dist/src/deadlines/deadline-scheduler.service.js'));

const { PromptBuilder } = require(path.resolve(__dirname, '../dist/src/ai/prompt-builder.js'));
const { CaseImporter } = require(path.resolve(__dirname, '../dist/src/onboarding/case-importer.js'));
const { formatAlertMessage } = require(path.resolve(__dirname, '../dist/src/telegram/telegram.helpers.js'));

function createConfig(values) {
  return {
    get(key, defaultValue) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue;
    },
  };
}

function createPrismaMock() {
  const users = [];
  const sessions = new Map();

  return {
    users,
    sessions,
    prisma: {
      user: {
        findFirst: async ({ where }) => {
          return (
            users.find((user) => {
              if (user.email !== where.email) return false;
              if (!where.tenant) return true;
              return user.tenant.slug === where.tenant.slug;
            }) ?? null
          );
        },
        findMany: async ({ where, take }) => {
          return users.filter((user) => user.email === where.email && user.isActive).slice(0, take ?? users.length);
        },
      },
      refreshToken: {
        create: async ({ data }) => {
          sessions.set(data.id, { ...data });
          return data;
        },
        findUnique: async ({ where }) => {
          const session = sessions.get(where.id);
          if (!session) return null;
          const user = users.find((item) => item.id === session.userId);
          return { ...session, user };
        },
        update: async ({ where, data }) => {
          const session = sessions.get(where.id);
          const updated = { ...session, ...data };
          sessions.set(where.id, updated);
          return updated;
        },
        updateMany: async ({ where, data }) => {
          const session = sessions.get(where.id);
          if (session && session.revokedAt === where.revokedAt) {
            sessions.set(where.id, { ...session, ...data });
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
      calendarEvent: {
        create: async ({ data }) => data,
        findMany: async () => [],
        deleteMany: async () => ({ count: 1 }),
      },
      deadline: {
        findMany: async () => [],
      },
      task: {
        findMany: async () => [],
      },
    },
  };
}

async function testAuthService() {
  const duplicateMock = createPrismaMock();
  const duplicatePassword = await argon2.hash('password123');

  duplicateMock.users.push(
    {
      id: 'u1',
      name: 'Admin 1',
      email: 'same@example.com',
      password: duplicatePassword,
      role: UserRole.TENANT_ADMIN,
      tenantId: 't1',
      isActive: true,
      tenant: { slug: 'tenant-1' },
    },
    {
      id: 'u2',
      name: 'Admin 2',
      email: 'same@example.com',
      password: duplicatePassword,
      role: UserRole.TENANT_ADMIN,
      tenantId: 't2',
      isActive: true,
      tenant: { slug: 'tenant-2' },
    },
  );

  const duplicateService = new AuthService(
    duplicateMock.prisma,
    new JwtService({ secret: 'test-secret' }),
    new ConfigService({ JWT_REFRESH_EXPIRES_IN: '30d' }),
  );

  await assert.rejects(
    () => duplicateService.login({ email: 'same@example.com', password: 'password123' }),
    /нужно указать slug компании/,
  );

  const mock = createPrismaMock();
  const password = await argon2.hash('password123');
  mock.users.push({
    id: 'u1',
    name: 'Alex',
    email: 'alex@example.com',
    password,
    role: UserRole.SUPER_ADMIN,
    tenantId: 't1',
    isActive: true,
    tenant: { slug: 'bg-studio-ai' },
  });

  const service = new AuthService(
    mock.prisma,
    new JwtService({ secret: 'test-secret' }),
    new ConfigService({ JWT_REFRESH_EXPIRES_IN: '30d' }),
  );

  const loginResult = await service.login(
    { email: 'alex@example.com', password: 'password123', tenantSlug: 'bg-studio-ai' },
    { userAgent: 'node-test', ipAddress: '127.0.0.1' },
  );

  assert.ok(loginResult.accessToken);
  assert.ok(loginResult.refreshToken);
  assert.equal(mock.sessions.size, 1);

  const firstSessionId = loginResult.refreshToken.split('.')[0];
  const firstSession = mock.sessions.get(firstSessionId);
  assert.equal(firstSession.userAgent, 'node-test');

  const refreshResult = await service.refresh(
    { refreshToken: loginResult.refreshToken },
    { userAgent: 'node-test-2', ipAddress: '127.0.0.2' },
  );

  assert.ok(refreshResult.accessToken);
  assert.ok(refreshResult.refreshToken);
  assert.notEqual(refreshResult.refreshToken, loginResult.refreshToken);
  assert.equal(mock.sessions.get(firstSessionId).revokedAt instanceof Date, true);
}

function createExecutionContext(request) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}

async function testTenantGuard() {
  const guard = new TenantGuard({ getAllAndOverride: () => false });
  const blockedRequest = {
    headers: { 'x-tenant-id': 'tenant-b' },
    user: {
      userId: 'u1',
      tenantId: 'tenant-a',
      email: 'member@example.com',
      role: UserRole.MEMBER,
    },
  };

  assert.throws(() => guard.canActivate(createExecutionContext(blockedRequest)), /Cross-tenant access denied/);

  const allowedRequest = {
    headers: { 'x-tenant-id': 'tenant-b' },
    user: {
      userId: 'u1',
      tenantId: 'tenant-a',
      email: 'admin@example.com',
      role: UserRole.SUPER_ADMIN,
    },
  };

  const result = guard.canActivate(createExecutionContext(allowedRequest));
  assert.equal(result, true);
  assert.equal(allowedRequest.tenantId, 'tenant-b');
}

async function testDeepseekService() {
  const originalFetch = global.fetch;
  let capturedBody = null;

  global.fetch = async (_url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: 'stop', message: { content: 'Готово' } }],
        usage: { prompt_tokens: 12, completion_tokens: 34 },
      }),
    };
  };

  try {
    const service = new DeepseekService(
      createConfig({
        DEEPSEEK_API_KEY: 'sk-test',
        DEEPSEEK_MODEL: 'deepseek-chat',
        DEEPSEEK_REASONER_MODEL: 'deepseek-reasoner',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
        DEEPSEEK_TIMEOUT_MS: '3000',
      }),
    );

    const result = await service.chat([{ role: 'user', content: 'Проанализируй риски' }], {
      useReasoner: true,
    });

    assert.equal(result.content, 'Готово');
    assert.equal(result.usedReasoner, true);
    assert.equal(result.model, 'deepseek-reasoner');
    assert.equal(result.promptTokens, 12);
    assert.equal(result.completionTokens, 34);
    assert.equal(capturedBody.model, 'deepseek-reasoner');
    assert.equal('temperature' in capturedBody, false);

    const missingKeyService = new DeepseekService(createConfig({ DEEPSEEK_API_KEY: 'sk-...' }));
    let missingKeyError = null;
    try {
      await missingKeyService.chat([{ role: 'user', content: 'test' }]);
    } catch (error) {
      missingKeyError = error;
    }

    assert.match(String(missingKeyError?.message), /DEEPSEEK_API_KEY is not configured/);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testEmbeddingsService() {
  const originalFetch = global.fetch;

  try {
    const deterministic = new EmbeddingsService(createConfig({ EMBEDDING_PROVIDER: 'deterministic' }));
    const first = await deterministic.embed('BooratramG4 test');
    const second = await deterministic.embed('BooratramG4 test');
    const third = await deterministic.embed('Different text');

    assert.equal(first.length, 1536);
    assert.deepEqual(first, second);
    assert.notDeepEqual(first, third);
    assert.equal(deterministic.getStatus().configuredProvider, 'deterministic');
    assert.equal(deterministic.getStatus().effectiveProvider, 'deterministic');
    assert.equal(deterministic.getStatus().mode, 'deterministic');
    assert.match(String(deterministic.getStatus().fallbackReason), /deterministic/);

    let capturedUrl = null;
    let capturedBody = null;
    global.fetch = async (url, options) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      };
    };

    const auto = new EmbeddingsService(
      createConfig({
        EMBEDDING_PROVIDER: 'auto',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
        OPENAI_BASE_URL: 'http://127.0.0.1:4011/v1',
        OPENAI_EMBEDDING_TIMEOUT_MS: '1200',
      }),
    );

    const liveVector = await auto.embed('Need live embeddings');
    assert.deepEqual(liveVector, [0.1, 0.2, 0.3]);
    assert.equal(capturedUrl, 'http://127.0.0.1:4011/v1/embeddings');
    assert.equal(capturedBody.model, 'text-embedding-3-small');
    assert.equal(auto.getStatus().configuredProvider, 'auto');
    assert.equal(auto.getStatus().effectiveProvider, 'openai');
    assert.equal(auto.getStatus().live, true);
    assert.equal(auto.getStatus().mode, 'openai');
    assert.equal(auto.getStatus().baseUrl, 'http://127.0.0.1:4011/v1');

    global.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({
        error: { message: 'provider offline' },
      }),
    });

    const strict = new EmbeddingsService(
      createConfig({
        EMBEDDING_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
      }),
    );

    await assert.rejects(() => strict.embed('Need strict mode'), /provider offline/);

    const legacy = new EmbeddingsService(createConfig({ EMBEDDING_PROVIDER: 'deepseek' }));
    assert.equal(legacy.getStatus().configuredProvider, 'auto');
    assert.equal(legacy.getStatus().effectiveProvider, 'deterministic');
    assert.match(String(legacy.getStatus().fallbackReason), /OPENAI_API_KEY/);
  } finally {
    global.fetch = originalFetch;
  }
}
async function testCalendarParser() {
  const service = new CalendarService(createPrismaMock().prisma);
  const parsed = service.parseNaturalLanguage('созвон с командой в пятницу после обеда по gogigo');

  assert.equal(parsed.type, 'MEETING');
  assert.equal(parsed.startAt.getHours(), 14);
  assert.equal(parsed.projectKey, 'gogigo');
}

async function testDeadlineScheduler() {
  const addedJobs = [];
  let removedJobs = 0;
  const queueMock = {
    add: async (name, data, options) => {
      addedJobs.push({ name, data, options });
    },
    getJobs: async () => [{ data: { deadlineId: 'deadline-1' }, remove: async () => { removedJobs += 1; } }],
    getDelayedCount: async () => 1,
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
  };

  const service = new DeadlineSchedulerService(queueMock);
  const schedule = await service.scheduleAlerts({
    id: 'deadline-1',
    title: 'Short deadline',
    tenantId: 'tenant-1',
    dueAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  assert.equal(schedule.scheduledCount, 1);
  assert.equal(addedJobs[0].data.minutesBefore, 0);

  const cancel = await service.cancelAlerts('deadline-1');
  assert.equal(cancel.removed, 1);
  assert.equal(removedJobs, 1);

  const stats = await service.getQueueStats();
  assert.equal(stats.delayed, 1);
}

async function testTelegramHelpers() {
  const text = formatAlertMessage(
    {
      title: 'Deploy',
      dueAt: new Date(Date.now() + 30 * 60 * 1000),
      priority: 'HIGH',
      status: 'PENDING',
    },
    30,
  );

  assert.match(text, /Напоминание о дедлайне/);
  assert.match(text, /Deploy/);
}

async function testPromptBuilderDateContext() {
  const builder = new PromptBuilder();
  const prompt = builder.build(
    {
      name: 'BG Studio AI',
      brainName: 'G4',
      brainPersona: null,
      brainContext: null,
      language: 'ru',
    },
    [],
    'Активных задач нет.',
  );

  assert.match(prompt, /СЕЙЧАС:/);
  assert.match(prompt, /ISO:/);
  assert.match(prompt, /Не выдумывай другую сегодняшнюю дату/);
}

async function testCaseImporter() {
  const importer = new CaseImporter();
  const jsonCases = importer.parse(
    JSON.stringify([
      {
        title: 'Case 1',
        context: 'ctx',
        problem: 'prob',
        solution: 'sol',
        tags: 'alpha|beta',
      },
    ]),
    'json',
  );

  assert.equal(jsonCases.length, 1);
  assert.deepEqual(jsonCases[0].tags, ['alpha', 'beta']);

  const csvCases = importer.parse(
    'title,context,problem,solution,tags\nCase 2,ctx,prob,sol,one|two',
    'csv',
  );

  assert.equal(csvCases.length, 1);
  assert.deepEqual(csvCases[0].tags, ['one', 'two']);

  assert.throws(
    () => importer.parse('title,context,solution\nBad,ctx,sol', 'csv'),
    /missing required field: problem/,
  );
}

async function main() {
  const tests = [
    ['auth.service', testAuthService],
    ['tenant.guard', testTenantGuard],
    ['ai.deepseek', testDeepseekService],
    ['ai.embeddings', testEmbeddingsService],
    ['calendar.parser', testCalendarParser],
    ['deadline.scheduler', testDeadlineScheduler],
    ['telegram.helpers', testTelegramHelpers],
    ['ai.prompt-builder', testPromptBuilderDateContext],
    ['onboarding.case-importer', testCaseImporter],
  ];

  for (const [name, fn] of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }

  console.log(`PASS total=${tests.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});






