import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function run(command, args) {
  return spawnSync(command, args, { cwd: root, stdio: 'inherit' })
}

const generated = run('node', ['scripts/gen-api.mjs'])
if (generated.status !== 0) {
  console.error('api:check could not regenerate the client (see the error above).')
  process.exit(generated.status ?? 1)
}

function changed(paths) {
  const result = spawnSync('git', ['status', '--porcelain', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
  })
  return result.stdout.trim().length > 0
}

const diff = run('git', ['diff', '--exit-code', '--', 'openapi/', 'src/api/generated/'])
if (diff.status === 0) {
  console.log('api:check passed: the vendored spec and the generated client are current.')
  process.exit(0)
}

const specStale = changed(['openapi/'])
const clientStale = changed(['src/api/generated/'])
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
process.exit(1)
