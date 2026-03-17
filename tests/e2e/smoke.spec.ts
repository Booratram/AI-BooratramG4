import { expect, test } from '@playwright/test';

function telegramMessage(updateId: number, messageId: number, chatId: number, text: string, commandLength?: number) {
  return {
    update_id: updateId,
    message: {
      message_id: messageId,
      date: Math.floor(Date.now() / 1000),
      text,
      ...(commandLength
        ? {
            entities: [
              {
                offset: 0,
                length: commandLength,
                type: 'bot_command',
              },
            ],
          }
        : {}),
      from: {
        id: chatId,
        is_bot: false,
        first_name: 'Smoke',
        username: 'smoke',
      },
      chat: {
        id: chatId,
        type: 'private',
        first_name: 'Smoke',
        username: 'smoke',
      },
    },
  };
}

function formatTelegramDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

test('login, brain, telegram, and deadlines smoke', async ({ page, request }) => {
  const stamp = `pw-${Date.now()}`;
  const telegramOwnerId = 424242;

  await page.goto('/login');
  await page.getByLabel('Email').fill('pilot-admin@bg-studio.ai');
  await page.getByLabel('Password').fill('change-me');
  await page.getByLabel('Tenant slug').fill('bg-studio-ai');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/client\/dashboard$/);
  await page.getByRole('link', { name: 'Brain' }).click();
  await expect(page).toHaveURL(/\/client\/brain$/);
  await expect(page.getByText(/DeepSeek: connected/i)).toBeVisible();
  await expect(page.getByText(/embeddings: openai/i)).toBeVisible();
  await expect(page.getByText(/Embedding config: openai/i)).toBeVisible();

  const prompt = `Smoke prompt ${stamp}`;
  await page.locator('main input').fill(prompt);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(`Stub response: ${prompt}`)).toBeVisible();
  await expect(page.getByText(/Model: deepseek-chat/i)).toBeVisible();

  const session = await page.evaluate(() => {
    const raw = window.localStorage.getItem('booratramg4.session');
    return raw ? JSON.parse(raw) : null;
  });

  expect(session?.accessToken).toBeTruthy();
  const authHeaders = {
    Authorization: `Bearer ${session.accessToken}`,
  };

  const telegramStatusResponse = await request.get('http://127.0.0.1:3003/api/telegram/status');
  expect(telegramStatusResponse.ok()).toBeTruthy();
  const telegramStatus = await telegramStatusResponse.json();
  expect(telegramStatus.transport).toBe('webhook');
  expect(telegramStatus.remoteApiDisabled).toBe(true);

  const queueBeforeResponse = await request.get('http://127.0.0.1:3003/api/deadlines/queue/stats', {
    headers: authHeaders,
  });
  expect(queueBeforeResponse.ok()).toBeTruthy();
  const queueBefore = await queueBeforeResponse.json();

  const taskWebhookResponse = await request.post('http://127.0.0.1:3003/api/telegram/webhook', {
    headers: {
      'x-telegram-bot-api-secret-token': 'e2e-secret',
    },
    data: telegramMessage(900001, 101, telegramOwnerId, `/task Smoke task ${stamp}`, 5),
  });
  expect(taskWebhookResponse.ok()).toBeTruthy();
  expect((await taskWebhookResponse.json()).accepted).toBe(true);

  const deadlineDueAt = formatTelegramDate(new Date(Date.now() + 3 * 60 * 1000));
  const deadlineWebhookResponse = await request.post('http://127.0.0.1:3003/api/telegram/webhook', {
    headers: {
      'x-telegram-bot-api-secret-token': 'e2e-secret',
    },
    data: telegramMessage(
      900002,
      102,
      telegramOwnerId,
      `/deadline Smoke deadline ${stamp} | ${deadlineDueAt}`,
      9,
    ),
  });
  expect(deadlineWebhookResponse.ok()).toBeTruthy();
  expect((await deadlineWebhookResponse.json()).accepted).toBe(true);

  const tasksResponse = await request.get('http://127.0.0.1:3003/api/tasks', {
    headers: authHeaders,
  });
  expect(tasksResponse.ok()).toBeTruthy();
  const tasks = await tasksResponse.json();
  expect(tasks.some((task: { title: string }) => task.title.includes(stamp))).toBe(true);

  const deadlinesResponse = await request.get('http://127.0.0.1:3003/api/deadlines', {
    headers: authHeaders,
  });
  expect(deadlinesResponse.ok()).toBeTruthy();
  const deadlines = await deadlinesResponse.json();
  expect(deadlines.some((deadline: { title: string }) => deadline.title.includes(stamp))).toBe(true);

  const queueAfterResponse = await request.get('http://127.0.0.1:3003/api/deadlines/queue/stats', {
    headers: authHeaders,
  });
  expect(queueAfterResponse.ok()).toBeTruthy();
  const queueAfter = await queueAfterResponse.json();
  expect(queueAfter.delayed).toBeGreaterThanOrEqual(queueBefore.delayed + 1);
});
