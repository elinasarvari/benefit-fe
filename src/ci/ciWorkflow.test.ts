import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const root = process.cwd()

type Record_ = Record<string, unknown>

function isRecord(value: unknown): value is Record_ {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function loadYaml(relativePath: string): Record_ {
  const parsed: unknown = parse(readFileSync(join(root, relativePath), 'utf8'))
  if (!isRecord(parsed)) {
    throw new Error(`${relativePath} is not a YAML mapping`)
  }
  return parsed
}

function jobsOf(workflow: Record_): Record<string, Record_> {
  const jobs = workflow.jobs
  if (!isRecord(jobs)) {
    throw new Error('workflow has no jobs')
  }
  return Object.fromEntries(
    Object.entries(jobs).filter((entry): entry is [string, Record_] => isRecord(entry[1])),
  )
}

function stepsOf(job: Record_ | undefined): Record_[] {
  const steps = job?.steps
  return Array.isArray(steps) ? steps.filter(isRecord) : []
}

function commandsOf(job: Record_ | undefined): string {
  return stepsOf(job)
    .map((step) => (typeof step.run === 'string' ? step.run : ''))
    .join('\n')
}

const ci = loadYaml('.github/workflows/ci.yml')
const jobs = jobsOf(ci)

function allWorkflowFiles(): string[] {
  const files = readdirSync(join(root, '.github/workflows')).map((f) => `.github/workflows/${f}`)
  const actions = readdirSync(join(root, '.github/actions')).map(
    (name) => `.github/actions/${name}/action.yml`,
  )
  return [...files, ...actions]
}

function externalActionRefs(file: string): string[] {
  const refs: string[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit)
    } else if (isRecord(node)) {
      if (typeof node.uses === 'string' && !node.uses.startsWith('./')) {
        refs.push(node.uses)
      }
      Object.values(node).forEach(visit)
    }
  }
  visit(loadYaml(file))
  return refs
}

describe('CI workflow', () => {
  it('FR-000-16: runs every required job', () => {
    expect(Object.keys(jobs)).toEqual(expect.arrayContaining(['static', 'unit', 'contract', 'e2e']))
  })

  it('FR-000-16: static runs lint, format, type-check, audit and gitleaks', () => {
    const commands = commandsOf(jobs.static)
    const uses = stepsOf(jobs.static).map((step) =>
      typeof step.uses === 'string' ? step.uses : '',
    )

    expect(commands).toContain('pnpm lint')
    expect(commands).toContain('pnpm format:check')
    expect(commands).toContain('pnpm typecheck')
    expect(commands).toContain('pnpm audit --audit-level high')
    expect(uses.some((ref) => ref.startsWith('gitleaks/gitleaks-action@'))).toBe(true)
  })

  it('FR-000-16: contract checks the generated client and the sibling openapi file', () => {
    const commands = commandsOf(jobs.contract)

    expect(commands).toContain('pnpm api:check')
    expect(commands).toContain('scripts/ci/resolve-sibling-ref.sh')
    expect(commands).toContain('openapi/openapi.json')
  })

  it('FR-000-20: e2e runs with the fake model and no AI credentials', () => {
    const env = jobs.e2e?.env

    expect(isRecord(env) ? env.LLM_MODE : undefined).toBe('fake')
    expect(JSON.stringify(jobs.e2e)).not.toMatch(/ANTHROPIC|AWS_/)
  })

  it('FR-000-16: every job has a timeout', () => {
    for (const [name, job] of Object.entries(jobs)) {
      expect(typeof job['timeout-minutes'], `${name} needs timeout-minutes`).toBe('number')
    }
  })

  it('FR-000-16: cancels superseded runs', () => {
    expect(ci.concurrency).toMatchObject({ 'cancel-in-progress': true })
  })

  it('FR-000-16: pins every external action by full commit SHA', () => {
    const unpinned = allWorkflowFiles()
      .flatMap(externalActionRefs)
      .filter((ref) => !/@[0-9a-f]{40}$/.test(ref))

    expect(unpinned).toEqual([])
  })
})
