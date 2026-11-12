import type { Page } from '@playwright/test'
import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { fillApplication } from './support/cases'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const PDF = Buffer.from('%PDF-1.4\nSYNTH pay stub\n%%EOF')
const TWELVE_MB = Buffer.alloc(12 * 1024 * 1024, 0x20)
const EMPLOYER = 'SYNTH-EMPLOYER'

// quickstart 3–4. The form has one pay stub per job (FR-002-21), up to 5 jobs per member, and at most
// 10 pay stubs per application (FR-002-17), so the eleventh stub needs a third member.

function stub(name: string, buffer: Buffer) {
  return { name, mimeType: 'application/pdf', buffer }
}

async function addJob(page: Page, member: number, job: number) {
  await page.getByRole('button', { name: `Add a job for Member ${String(member)}` }).click()
  const label = `Member ${String(member)} job ${String(job)}`
  await page.getByLabel(`${label} employer`, { exact: true }).fill(EMPLOYER)
  await page.getByLabel(`${label} pay frequency`, { exact: true }).selectOption('biweekly')
  await page.getByLabel(`${label} monthly gross income (USD)`).fill('1800.00')
  return label
}

async function addStub(page: Page, job: string, file: ReturnType<typeof stub>) {
  await page.getByRole('button', { name: `Add a pay stub for ${job}` }).click()
  await page.getByLabel(`${job} pay stub file`).setInputFiles(file)
}

async function startWithIncome(page: Page) {
  await page.goto('/applicant/apply')
  await fillApplication(page)
  await page.getByRole('checkbox', { name: 'Member 1 has no income' }).uncheck()
}

test.describe('applicant uploads pay stubs', () => {
  // A successful submission needs a household with no case and no coverage. The other journeys use
  // applicants 1 to 3, so this one signs in as applicant4 (household D, seeded clean).
  test.describe('with a clean household', () => {
    test.use({ storageState: storageStatePath('applicant4') })
    test('SC_002_06_applicant_submits_with_stub_under_five_minutes', async ({ page }) => {
      const started = Date.now()
      await startWithIncome(page)
      const job = await addJob(page, 1, 1)
      await addStub(page, job, stub('synth-stub.pdf', PDF))
      const payDate = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10)
      await page.getByLabel(`${job} pay stub employee name`).fill('Synthetic Person')
      await page.getByLabel(`${job} pay stub pay frequency`).selectOption('biweekly')
      await page.getByLabel(`${job} pay stub gross pay (USD)`).fill('830.77')
      await page.getByLabel(`${job} pay stub pay date`).fill(payDate)

      await page.getByRole('button', { name: /send application/i }).click()

      await expect(page.getByRole('heading', { name: /application received/i })).toBeVisible()
      await expect(page.getByText(`${EMPLOYER}: synth-stub.pdf`)).toBeVisible()
      expect(Date.now() - started).toBeLessThan(FIVE_MINUTES_MS)
    })
  })

  // Refused before anything is sent, so any applicant will do.
  test.describe('refusals', () => {
    test.use({ storageState: storageStatePath('applicant') })
    test('FR_002_17_browser_refuses_big_file_and_eleventh_file', async ({ page }) => {
      await startWithIncome(page)

      // A file over 10 MB is refused at once, with the allowed sizes and types, and the form is kept.
      const first = await addJob(page, 1, 1)
      await addStub(page, first, stub('big.pdf', TWELVE_MB))
      const refused = page.getByText(/big\.pdf is larger than 10 MB/i)
      await expect(refused).toBeVisible()
      await expect(refused).toContainText(/PDF, PNG or JPEG/i)
      await expect(page.getByLabel('Member 1 full name')).toHaveValue('Synthetic Person')
      await page.getByLabel(`${first} pay stub file`).setInputFiles(stub('stub-1.pdf', PDF))

      // Eleven stubs: five jobs each for members 1 and 2, one for member 3.
      let count = 1
      for (let job = 2; job <= 5; job += 1) {
        count += 1
        await addStub(page, await addJob(page, 1, job), stub(`stub-${String(count)}.pdf`, PDF))
      }
      for (const member of [2, 3]) {
        await page.getByRole('button', { name: 'Add a household member' }).click()
        const jobs = member === 2 ? 5 : 1
        for (let job = 1; job <= jobs; job += 1) {
          count += 1
          await addStub(
            page,
            await addJob(page, member, job),
            stub(`stub-${String(count)}.pdf`, PDF),
          )
        }
      }
      expect(count).toBe(11)

      await page.getByRole('button', { name: /send application/i }).click()

      const summary = page.getByRole('alert')
      await expect(summary).toContainText('Too many pay stubs: 11 attached')
      await expect(summary).toContainText(/at most 10/i)
      await expect(page.getByRole('heading', { name: /application received/i })).toHaveCount(0)
      await expect(page.getByLabel('Member 1 full name')).toHaveValue('Synthetic Person')
    })
  })
})
