// The case ID a submission reference will produce (ADR-002-01): UUIDv5 over SUBMISSION_NS, the same
// value as `case_id_for` in benefit-be `packages/domain/case.py`. Pay stubs are uploaded against it
// before the application is sent. The namespace is copied from benefit-be and never changes;
// `caseId.test.ts` pins one vector computed there.
export const SUBMISSION_NS = '6f1c2a54-0b7e-5d3a-9c41-2e8f0d5b7a13'

function uuidBytes(uuid: string): Uint8Array {
  const hex = uuid.replaceAll('-', '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export async function caseIdFor(reference: string): Promise<string> {
  const name = new TextEncoder().encode(reference)
  const input = new Uint8Array(16 + name.length)
  input.set(uuidBytes(SUBMISSION_NS), 0)
  input.set(name, 16)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', input))
  const bytes = digest.slice(0, 16)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50 // version 5
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80 // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
