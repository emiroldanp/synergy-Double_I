import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 45000,
  expect: { timeout: 12000 },
  retries: 1,
  workers: 1, // staging no aguanta paralelo
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://staging.doubleicards.com',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'e2e-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'e2e-mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/report' }]],
})
