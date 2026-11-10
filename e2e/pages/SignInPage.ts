import type { Locator, Page } from '@playwright/test'

export class SignInPage {
  readonly heading: Locator
  readonly username: Locator
  readonly password: Locator
  readonly submit: Locator
  readonly notice: Locator
  readonly error: Locator
  readonly syntheticBanner: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Sign in' })
    this.username = page.getByLabel('Username')
    this.password = page.getByLabel('Password')
    this.submit = page.getByRole('button', { name: 'Sign in' })
    this.notice = page.getByRole('status')
    this.error = page.getByRole('alert')
    this.syntheticBanner = page.getByRole('region', { name: /synthetic/i })
  }

  async goto(reason?: 'expired' | 'required'): Promise<void> {
    await this.page.goto(reason ? `/sign-in?reason=${reason}` : '/sign-in')
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.username.fill(username)
    await this.password.fill(password)
    await this.submit.click()
  }
}
