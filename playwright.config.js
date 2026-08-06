// =============================================================
// playwright.config.js
// =============================================================

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir:  './tests',
  timeout:  60000,
  retries:  1,                // retry once on failure (gives healing a chance)
  workers:  1,                // run tests sequentially to avoid registry conflicts

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }]
  ],

  use: {
    headless:      false,     // set true for CI
    viewport:      { width: 1280, height: 720 },
    screenshot:    'only-on-failure',
    video:         'retain-on-failure',
    trace:         'on-first-retry',
    actionTimeout: 15000,
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] }
    }
  ],

  // Forbid test.only in CI to prevent accidental skips
  forbidOnly: !!process.env.CI,

  outputDir: 'reports/test-results'
});
