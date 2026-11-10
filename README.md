# benefit-fe

React 19 + TypeScript (strict) + Vite single-page app. All data shown is synthetic.

## Commands

Requires Node 24 and pnpm 11 (`corepack enable`).

| Command                                              | Purpose                                                                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                     | Install the pinned dependencies                                                                                                                                                              |
| `pnpm dev`                                           | Dev server on :5173; `/api` is proxied to `API_BASE_URL` (default `http://localhost:8000`)                                                                                                   |
| `pnpm lint` / `pnpm format:check` / `pnpm typecheck` | ESLint, Prettier and `tsc -b --noEmit`                                                                                                                                                       |
| `pnpm test`                                          | Vitest (one run, `TZ=America/Chicago`)                                                                                                                                                       |
| `pnpm build`                                         | Type-check and build to `dist/`                                                                                                                                                              |
| `pnpm api:gen`                                       | Vendor `openapi/openapi.json` at the SHA in `openapi/BE_COMMIT` and regenerate `src/api/generated/schema.d.ts`. `BE_LOCAL=1 pnpm api:gen` reads `../benefit-be/openapi/openapi.json` instead |
| `pnpm api:check`                                     | Run `api:gen` (also honours `BE_LOCAL=1`), then fail if `openapi/` or `src/api/generated/` differ from what is committed; says which side is stale                                           |
| `pnpm e2e`                                           | Playwright on Chromium against the running stack (`make dev` in benefit-be, or `Procfile.ci`)                                                                                                |
| `pnpm e2e:all`                                       | The same on Chromium, Firefox and WebKit (run nightly in CI)                                                                                                                                 |

Copy `.env.example` to `.env` for local settings. Never edit `src/api/generated/`.

## End-to-end tests

`e2e/` holds the Playwright suite (page objects in `e2e/pages/`, an axe accessibility fixture in `e2e/fixtures.ts`). It needs the backend stack running and the `E2E_*` settings from `.env.example`; `E2E_PASSWORD` must equal the backend `DEMO_PASSWORD`. Install a browser once with `pnpm exec playwright install chromium`. The six journey specs are marked `test.fixme` with a `pending` annotation until the feature that builds them lands.

## CI

`.github/workflows/ci.yml` runs `static`, `unit`, `contract` and `e2e` on every pull request. The `e2e` job checks out benefit-be at the branch with the same name (otherwise `main`) using `scripts/ci/resolve-sibling-ref.sh`. `nightly.yml` runs all browsers. Every action is pinned by commit SHA.

`openapi/BE_COMMIT` must hold a real benefit-be commit SHA. While it is the all-zero placeholder, run the unit tests with `ALLOW_PLACEHOLDER_BE_COMMIT=1 pnpm test`.
