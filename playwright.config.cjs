const { defineConfig, devices } = require('@playwright/test');
const fullBrowserMatrix = Boolean(process.env.CI || process.env.PLAYWRIGHT_ALL_BROWSERS);
const serverPort = Number.parseInt(process.env.PLAYWRIGHT_PORT || '4173', 10);
if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65_535) {
  throw new Error('PLAYWRIGHT_PORT must be an integer between 1 and 65535.');
}
const baseURL = `http://127.0.0.1:${serverPort}`;
// Pixel snapshots use Windows as their single canonical rendering platform.
// CI and other operating systems run the platform-independent layout,
// interaction, accessibility, touch, and performance checks instead.
const runVisualSnapshots = process.platform === 'win32' && !process.env.CI;

module.exports = defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/support/global-setup.cjs'),
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
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
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
        grep: /@cross-browser/,
        use: { ...devices['Desktop Firefox'] }
      },
      {
        name: 'webkit',
        testIgnore: /visual\.spec\.js/,
        grep: /@cross-browser/,
        use: { ...devices['Desktop Safari'] }
      }
    ] : [])
  ]
});
