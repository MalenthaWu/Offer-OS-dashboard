import { defineConfig, devices } from '@playwright/test';

delete process.env.NO_COLOR;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'env -u NO_COLOR npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
  // Every Playwright test gets a new browser context, so IndexedDB state is
  // isolated across test cases and projects without a shared storage state.
  projects: [
    {
      name: 'chromium-desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-desktop-1024',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'chromium-mobile-390',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
});
