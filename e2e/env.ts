export type Role = 'applicant' | 'applicant2' | 'applicant3' | 'caseworker' | 'supervisor'

const DEFAULT_USERNAMES: Record<Role, string> = {
  applicant: 'applicant1',
  applicant2: 'applicant2',
  applicant3: 'applicant3',
  caseworker: 'caseworker1',
  supervisor: 'supervisor1',
}

const USERNAME_VARIABLES: Record<Role, string> = {
  applicant: 'E2E_APPLICANT_USERNAME',
  applicant2: 'E2E_APPLICANT2_USERNAME',
  applicant3: 'E2E_APPLICANT3_USERNAME',
  caseworker: 'E2E_CASEWORKER_USERNAME',
  supervisor: 'E2E_SUPERVISOR_USERNAME',
}

export const ROLES = Object.keys(DEFAULT_USERNAMES) as Role[]

export function usernameFor(role: Role): string {
  const configured = process.env[USERNAME_VARIABLES[role]]
  return configured && configured.length > 0 ? configured : DEFAULT_USERNAMES[role]
}

export function demoPassword(): string {
  const password = process.env.E2E_PASSWORD
  if (!password) {
    throw new Error(
      'E2E_PASSWORD is empty. Set it to the backend DEMO_PASSWORD (see .env.example).',
    )
  }
  return password
}

export function storageStatePath(role: Role): string {
  return `e2e/.auth/${role}.json`
}
