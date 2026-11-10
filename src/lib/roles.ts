import type { components } from '@/api/generated/schema'

export type Role = components['schemas']['Role']

const GRANTED_BY: Record<Role, readonly Role[]> = {
  applicant: ['applicant'],
  caseworker: ['caseworker'],
  supervisor: ['supervisor', 'caseworker'],
}

export function hasAnyRole(actual: Role, allowed: readonly Role[]): boolean {
  return allowed.some((role) => GRANTED_BY[actual].includes(role))
}

export function homePathFor(role: Role): string {
  return role === 'applicant' ? '/applicant' : '/caseworker'
}
