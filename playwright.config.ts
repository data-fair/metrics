import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests',
  // the api and e2e tests share the state of one dev env (the daily-api-metrics collection)
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // a flake must not cost a full re-run in CI
  retries: process.env.CI ? 1 : 0,
  // on a failure: npx playwright show-trace test-results/<test>/trace.zip (api and daemon pane logs attached there)
  // the json report keeps the per-test durations of the last run, used to size the smoke set
  reporter: [['dot'], ['json', { outputFile: 'dev/logs/test-timings.json' }]],
  // per test, hooks included: a heavy spec calls test.slow() instead of raising this
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },

  projects: [
    // no server, no shared state
    { name: 'unit', testMatch: /.*\.unit\.spec\.ts/, fullyParallel: true },
    { name: 'state-setup', testMatch: /state-setup\.ts/ },
    { name: 'api', testMatch: /.*\.api\.spec\.ts/, dependencies: ['state-setup'] },
    {
      // the first hit on a Vite dev route compiles it on demand, which can exceed the per-test timeout
      name: 'e2e-warmup',
      testMatch: /e2e-warmup\.ts/,
      dependencies: ['state-setup'],
      timeout: 120_000,
      use: { ...devices['Desktop Chrome'], actionTimeout: 60_000, navigationTimeout: 60_000 },
    },
    {
      name: 'e2e',
      testMatch: /.*\.e2e\.spec\.ts/,
      dependencies: ['e2e-warmup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ]
})
