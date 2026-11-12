import { existsSync } from 'node:fs'
import { defineConfig, devices, type PlaywrightTestOptions, type Project } from '@playwright/test'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

// The journeys share three seeded households (`make reset` in benefit-be before a run), and some
// need a household with no case while others decide or approve its case. Each browser runs them in
// three phases so no journey sees another's household half-way:
//   1. `<browser>-applications`: the successful applications (TC-145, 147, 156) on clean households;
//   2. `<browser>-journeys`: everything that only reads a case or makes sure one exists;
//   3. `<browser>`: the caseworker and supervisor decisions, which close cases or grant coverage.
// Selecting `--project=<browser>` runs its earlier phases first, as dependencies.
const APPLICATIONS = /(apply-for-coverage|verification-applicant)\.spec\.ts/
const DECISIONS = /caseworker-approves-denial\.spec\.ts/
const SETUP = /auth\.setup\.ts/

function phases(name: string, device: Partial<PlaywrightTestOptions>): Project[] {
  return [
    { name: `${name}-applications`, use: device, dependencies: ['setup'], testMatch: APPLICATIONS },
    {
      name: `${name}-journeys`,
      use: device,
      dependencies: [`${name}-applications`],
      testIgnore: [SETUP, APPLICATIONS, DECISIONS],
    },
    { name, use: device, dependencies: [`${name}-journeys`], testMatch: DECISIONS },
  ]
}

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [['html', { outputFolder: '../playwright-report' }], ['list']]
    : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    timezoneId: 'America/Chicago',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: SETUP },
    ...phases('chromium', { ...devices['Desktop Chrome'] }),
    ...phases('firefox', { ...devices['Desktop Firefox'] }),
    ...phases('webkit', { ...devices['Desktop Safari'] }),
  ],
})
