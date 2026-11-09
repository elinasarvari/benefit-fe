import { expect, test as setup } from '@playwright/test'
import { demoPassword, ROLES, storageStatePath, usernameFor } from './env'

for (const role of ROLES) {
  setup(`sign in as ${role}`, async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: { username: usernameFor(role), password: demoPassword() },
    })

    expect(response.ok(), `sign-in as ${role} failed with ${String(response.status())}`).toBe(true)
    await request.storageState({ path: storageStatePath(role) })
  })
}
