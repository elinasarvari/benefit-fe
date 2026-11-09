import { demoPassword, type Role, storageStatePath, usernameFor } from './env'
import { expect, test } from './fixtures'
import { SignInPage } from './pages/SignInPage'

const LANDING: { role: Role; path: string; heading: RegExp }[] = [
  { role: 'applicant', path: '/applicant', heading: /applicant portal/i },
  { role: 'caseworker', path: '/caseworker', heading: /caseworker console/i },
  { role: 'supervisor', path: '/caseworker', heading: /caseworker console/i },
]

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('FR-000-06: unauthenticated visitor is redirected to sign-in', async ({ page }) => {
    const signIn = new SignInPage(page)

    await page.goto('/caseworker')

    await expect(page).toHaveURL(/\/sign-in\?reason=required$/)
    await expect(signIn.notice).toContainText(/sign in to continue/i)
  })

  test('FR-000-21: wrong credentials show the error and its reference ID', async ({ page }) => {
    const signIn = new SignInPage(page)
    await signIn.goto()

    await signIn.signIn(usernameFor('caseworker'), 'not-the-demo-password')

    await expect(signIn.error).toContainText(/invalid/i)
    await expect(signIn.error).toContainText(/reference id/i)
  })

  for (const { role, path, heading } of LANDING) {
    test(`FR-000-05: ${role} lands in their own area`, async ({ page }) => {
      const signIn = new SignInPage(page)
      await signIn.goto()

      await signIn.signIn(usernameFor(role), demoPassword())

      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    })
  }

  test('FR-000-14: synthetic banner visible on the sign-in page and a missing page', async ({
    page,
  }) => {
    const signIn = new SignInPage(page)

    await signIn.goto()
    await expect(signIn.syntheticBanner).toBeVisible()
    await page.goto('/no-such-page')

    await expect(signIn.syntheticBanner).toBeVisible()
  })

  test('sign-in page has no serious accessibility violations', async ({
    page,
    expectNoSeriousA11yViolations,
  }) => {
    await new SignInPage(page).goto()

    await expectNoSeriousA11yViolations()
  })
})

test.describe('signed in', () => {
  for (const { role, path, heading } of LANDING) {
    test.describe(role, () => {
      test.use({ storageState: storageStatePath(role) })

      test(`FR-000-14: synthetic banner visible on the ${role} landing page`, async ({ page }) => {
        await page.goto(path)

        await expect(page.getByRole('heading', { name: heading })).toBeVisible()
        await expect(new SignInPage(page).syntheticBanner).toBeVisible()
      })

      test(`${role} landing page has no serious accessibility violations`, async ({
        page,
        expectNoSeriousA11yViolations,
      }) => {
        await page.goto(path)
        await expect(page.getByRole('heading', { name: heading })).toBeVisible()

        await expectNoSeriousA11yViolations()
      })
    })
  }

  test.describe('applicant', () => {
    test.use({ storageState: storageStatePath('applicant') })

    test('FR-000-05: an applicant opening the caseworker area sees access denied', async ({
      page,
    }) => {
      await page.goto('/caseworker')

      await expect(page.getByRole('heading', { name: /access denied/i })).toBeVisible()
    })
  })
})
