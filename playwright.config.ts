import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against the production build, which is what a reader gets.
 *
 * Set BASE_URL to run the same suite against a deployed site instead:
 *   BASE_URL=https://example.netlify.app npm run test:e2e
 */
const deployed = process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: deployed ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(deployed
    ? {}
    : {
        webServer: {
          command: 'npm run build && npm run preview -- --port 4173 --strictPort',
          port: 4173,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
