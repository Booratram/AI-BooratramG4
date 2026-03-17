import { defineConfig } from '@playwright/test';

const baseBackendEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: '3003',
  FRONTEND_URL: 'http://127.0.0.1:4173',
  DEEPSEEK_API_KEY: 'sk-test',
  DEEPSEEK_BASE_URL: 'http://127.0.0.1:4011',
  DEEPSEEK_TIMEOUT_MS: '10000',
  EMBEDDING_PROVIDER: 'openai',
  OPENAI_API_KEY: 'sk-test',
  OPENAI_BASE_URL: 'http://127.0.0.1:4011/v1',
  OPENAI_EMBEDDING_TIMEOUT_MS: '10000',
  TELEGRAM_TRANSPORT: 'webhook',
  BACKEND_PUBLIC_URL: 'http://127.0.0.1:3003',
  TELEGRAM_WEBHOOK_SECRET: 'e2e-secret',
  TELEGRAM_SKIP_REMOTE_API: 'true',
  PILOT_TELEGRAM_BOT_TOKEN: '123456:test-token',
  PILOT_TELEGRAM_OWNER_ID: '424242',
  PILOT_TENANT_ID: '',
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/e2e/ai-stub.js',
      url: 'http://127.0.0.1:4011/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm --workspace backend run start',
      url: 'http://127.0.0.1:3003/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: baseBackendEnv,
    },
    {
      command: 'npm --workspace frontend run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_API_URL: '/api',
      },
    },
  ],
});
