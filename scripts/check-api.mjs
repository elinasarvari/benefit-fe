import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SPEC = 'openapi/openapi.json'
const CLIENT = 'src/api/generated/schema.d.ts'

function run(command, args) {
  return spawnSync(command, args, { cwd: root, stdio: 'inherit' })
}

async function contents(path) {
  return readFile(`${root}${path}`, 'utf8').catch(() => null)
}

// Compare the files as they are now with what regeneration writes, not with git's index: the
// check must hold on a branch whose spec and client are updated but not yet committed.
const before = { spec: await contents(SPEC), client: await contents(CLIENT) }

const generated = run('node', ['scripts/gen-api.mjs'])
if (generated.status !== 0) {
  console.error('api:check could not regenerate the client (see the error above).')
  process.exit(generated.status ?? 1)
}

const specStale = (await contents(SPEC)) !== before.spec
const clientStale = (await contents(CLIENT)) !== before.client
if (!specStale && !clientStale) {
  console.log('api:check passed: the vendored spec and the generated client are current.')
  process.exit(0)
}

if (specStale) {
  console.error(
    '\nThe vendored openapi/openapi.json is out of date with benefit-be at the commit in ' +
      'openapi/BE_COMMIT. Run `pnpm api:gen` (or update BE_COMMIT) and commit the result.',
  )
}
if (clientStale) {
  console.error(
    '\nsrc/api/generated/schema.d.ts is out of date with openapi/openapi.json. ' +
      'Run `pnpm api:gen` and commit the result.',
  )
}
// Regeneration has already written the current files; `git diff` shows what changed.
process.exit(1)
