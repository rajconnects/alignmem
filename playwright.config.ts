import { defineConfig } from '@playwright/test'

// Playwright config for the golden-path E2E test.
// Spawns the built server on port 3101 so it doesn't clash with dev.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run build && cross-env NODE_ENV=production PORT=3101 ALIGNMEM_HOME=./.e2e-home node dist/server/index.js',
    port: 3101,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'production',
      PORT: '3101',
      ALIGNMEM_HOME: './.e2e-home'
    }
  }
})
