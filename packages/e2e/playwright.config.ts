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
    // En CI, `nuxt dev` compile les modules à la volée (Vite) : la toute
    // première navigation peut se terminer avant que l'hydratation Vue soit
    // finie, et les clics de Playwright tombent alors sur un DOM inerte (voir
    // #114 — tests bloqués sur /auth/login, aucune requête /auth/login émise).
    // On build donc le frontend et on le sert en prod pour avoir une
    // hydratation immédiate et déterministe. En local on garde `dev` (HMR).
    command: process.env.CI ? 'bun run build && bun run preview' : 'bun run dev',
    cwd: frontendDir,
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 120_000,
    env: {
      GATEWAY_INTERNAL_URL: process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:3001',
      ...(process.env.CI ? { PORT: '8000', HOST: '0.0.0.0' } : {}),
    },
  },
});
