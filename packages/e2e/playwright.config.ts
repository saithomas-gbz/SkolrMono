import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(__dirname, '../frontend');

/**
 * E2E Skolr (#114). Le backend monolithe (port 3001) et sa base seedée sont
 * supposés démarrés en amont (docker compose + `bun run db:run:stack`, ou le
 * workflow e2e.yml en CI). Playwright ne lance ici que le frontend Nuxt, qui
 * proxifie `/api/*` vers `GATEWAY_INTERNAL_URL` (le backend).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'bun run dev',
    cwd: frontendDir,
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      GATEWAY_INTERNAL_URL: process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:3001',
    },
  },
});
