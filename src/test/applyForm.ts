import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

// Fills the smallest valid application (synthetic data only): one adult, no income, an IL address.
export async function fillValidApplication(user: UserEvent): Promise<void> {
  await user.type(await screen.findByLabelText('Member 1 full name'), 'Synthetic Person')
  await user.type(screen.getByLabelText('Member 1 date of birth'), '1980-01-01')
  await user.click(screen.getByRole('radio', { name: 'U.S. citizen' }))
  await user.click(screen.getByRole('checkbox', { name: 'Member 1 has no income' }))
  await user.type(screen.getByLabelText('Street address'), '1 Test Street')
  await user.type(screen.getByLabelText('City'), 'Springfield')
  await user.type(screen.getByLabelText('ZIP code'), '62701')
}
