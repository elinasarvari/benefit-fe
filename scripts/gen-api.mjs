import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const specPath = `${root}openapi/openapi.json`
const schemaPath = `${root}src/api/generated/schema.d.ts`
const REPO = 'elinasarvari/benefit-be'

async function loadSpec() {
  if (process.env.BE_LOCAL === '1') {
    return readFile(`${root}../benefit-be/openapi/openapi.json`, 'utf8')
  }
  const sha = (await readFile(`${root}openapi/BE_COMMIT`, 'utf8')).trim()
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error(`openapi/BE_COMMIT must hold a 40-character commit SHA, got "${sha}"`)
  }
  if (/^0+$/.test(sha)) {
    console.warn('BE_COMMIT is a placeholder; using the vendored openapi/openapi.json as is.')
    return readFile(specPath, 'utf8')
  }
  const url = `https://raw.githubusercontent.com/${REPO}/${sha}/openapi/openapi.json`
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: HTTP ${String(response.status)}`)
  }
  return response.text()
}

const spec = await loadSpec()
JSON.parse(spec)
await writeFile(specPath, spec.endsWith('\n') ? spec : `${spec}\n`)
execFileSync('pnpm', ['exec', 'openapi-typescript', specPath, '--output', schemaPath], {
  cwd: root,
  stdio: 'inherit',
})
