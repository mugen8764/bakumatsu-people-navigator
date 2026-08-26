const { defineConfig, devices } = require('@playwright/test');
const fullBrowserMatrix = Boolean(process.env.CI || process.env.PLAYWRIGHT_ALL_BROWSERS);
// Pixel snapshots use Windows as their single canonical rendering platform.
// CI and other operating systems run the platform-independent layout,
// interaction, accessibility, touch, and performance checks instead.
const runVisualSnapshots = process.platform === 'win32' && !process.env.CI;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tests/support/static-server.cjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: runVisualSnapshots ? [] : [/visual\.spec\.js/],
      use: { ...devices['Desktop Chrome'] }
    },
    ...(fullBrowserMatrix ? [
      {
        name: 'firefox',
        testIgnore: /visual\.spec\.js/,
        use: { ...devices['Desktop Firefox'] }
      },
      {
        name: 'webkit',
        testIgnore: /visual\.spec\.js/,
        use: { ...devices['Desktop Safari'] }
      }
    ] : [])
  ]
});
