import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('generated API client', () => {
  it('FR-000-26: BE_COMMIT is a full commit SHA', () => {
    const sha = readFileSync(join(root, 'openapi/BE_COMMIT'), 'utf8').trim()

    expect(sha).toMatch(/^[0-9a-f]{40}$/)
    if (process.env.ALLOW_PLACEHOLDER_BE_COMMIT !== '1') {
      expect(sha, 'BE_COMMIT is still the all-zero placeholder').not.toMatch(/^0{40}$/)
    }
  })

  it('FR-000-26: the generated schema is current for the vendored openapi file', () => {
    const scratchRoot = join(root, 'node_modules/.tmp')
    mkdirSync(scratchRoot, { recursive: true })
    const scratch = mkdtempSync(join(scratchRoot, 'schema-'))
    const regenerated = join(scratch, 'schema.d.ts')

    try {
      execFileSync(
        'pnpm',
        ['exec', 'openapi-typescript', join(root, 'openapi/openapi.json'), '--output', regenerated],
        { cwd: root, stdio: 'pipe' },
      )

      expect(readFileSync(regenerated, 'utf8')).toBe(
        readFileSync(join(root, 'src/api/generated/schema.d.ts'), 'utf8'),
      )
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  }, 30_000)
})
