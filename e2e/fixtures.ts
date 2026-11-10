import AxeBuilder from '@axe-core/playwright'
import { expect, test as base } from '@playwright/test'

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

interface Fixtures {
  expectNoSeriousA11yViolations: () => Promise<void>
}

export const test = base.extend<Fixtures>({
  expectNoSeriousA11yViolations: async ({ page }, use) => {
    await use(async () => {
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
      const blocking = violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      )
      expect(
        blocking.map((violation) => `${violation.id}: ${violation.help}`),
        'serious or critical WCAG 2.1 AA violations',
      ).toEqual([])
    })
  },
})

export { expect }
