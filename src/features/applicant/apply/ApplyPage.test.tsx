import { screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { components } from '@/api/generated/schema'
import { fillValidApplication } from '@/test/applyForm'
import { CASE_ID, caseStatus } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

type Submission = components['schemas']['ApplicationSubmission']

describe('ApplyPage', () => {
  it('FR-001-23: double submit sends one request with one submission reference', async () => {
    const bodies: Submission[] = []
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    signedInAs('applicant')
    respondTo('POST /api/v1/applications', async (request) => {
      bodies.push((await request.json()) as Submission)
      await gate
      return jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup()
    renderApp('/applicant/apply')
    await fillValidApplication(user)

    const send = screen.getByRole('button', { name: /send application/i })
    await user.click(send)
    await user.click(send)

    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled()
    release()
    expect(await screen.findByRole('heading', { name: /application received/i })).toBeVisible()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]?.submission_reference).toMatch(/^[0-9a-f-]{36}$/)
    expect(screen.getByText(CASE_ID)).toBeVisible()
  })

  it('FR-001-23: a retry after a server failure reuses the same submission reference', async () => {
    const references: string[] = []
    signedInAs('applicant')
    respondTo('POST /api/v1/applications', async (request) => {
      references.push(((await request.json()) as Submission).submission_reference)
      return references.length === 1
        ? errorResponse(503, 'dependency_unavailable', 'Try again shortly.')
        : jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup()
    renderApp('/applicant/apply')
    await fillValidApplication(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))
    expect(await screen.findByText('Try again shortly.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /send application/i }))

    await waitFor(() => {
      expect(references).toHaveLength(2)
    })
    expect(references[1]).toBe(references[0])
  })

  it('FR-001-25: a refused submission shows the reason and a link to the related case', async () => {
    signedInAs('applicant')
    respondTo('POST /api/v1/applications', () =>
      jsonResponse(
        {
          error: {
            code: 'conflict',
            message: 'Conflict',
            fields: [{ field: 'household', message: 'open', type: 'household_has_open_case' }],
            reference_id: 'ref-1',
            related_case_id: CASE_ID,
          },
        },
        409,
      ),
    )
    const user = userEvent.setup()
    renderApp('/applicant/apply')
    await fillValidApplication(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByText(/already has an open case/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /related case/i })).toHaveAttribute(
      'href',
      `/applicant/cases/${CASE_ID}`,
    )
  })
})

async function fillApplicationWithStub(user: UserEvent): Promise<void> {
  await user.type(await screen.findByLabelText('Member 1 full name'), 'Synthetic Person')
  await user.type(screen.getByLabelText('Member 1 date of birth'), '1980-01-01')
  await user.click(screen.getByRole('radio', { name: 'U.S. citizen' }))
  await user.click(screen.getByRole('button', { name: 'Add a job for Member 1' }))
  await user.type(screen.getByLabelText('Member 1 job 1 employer'), 'Synthetic Employer')
  await user.selectOptions(screen.getByLabelText('Member 1 job 1 pay frequency'), 'weekly')
  await user.type(screen.getByLabelText('Member 1 job 1 monthly gross income (USD)'), '1300.00')
  await user.click(screen.getByRole('button', { name: 'Add a pay stub for Member 1 job 1' }))
  await user.upload(
    screen.getByLabelText('Member 1 job 1 pay stub file'),
    new File(['%PDF-1.4 synthetic'], 'stub.pdf', { type: 'application/pdf' }),
  )
  await user.type(
    screen.getByLabelText('Member 1 job 1 pay stub employee name'),
    'Synthetic Person',
  )
  await user.selectOptions(screen.getByLabelText('Member 1 job 1 pay stub pay frequency'), 'weekly')
  await user.type(screen.getByLabelText('Member 1 job 1 pay stub gross pay (USD)'), '300')
  await user.type(screen.getByLabelText('Member 1 job 1 pay stub pay date'), '2026-03-01')
  await user.type(screen.getByLabelText('Street address'), '1 Test Street')
  await user.type(screen.getByLabelText('City'), 'Springfield')
  await user.type(screen.getByLabelText('ZIP code'), '62701')
}

const DOCUMENT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

// A fixed reference makes the case ID known: caseIdFor(REFERENCE) is the pinned benefit-be vector.
const REFERENCE = '11111111-2222-4333-8444-555555555555'
const UPLOAD_CASE_ID = 'f587334f-3e85-58f0-9c1e-f44a79e9586c'
const DOCUMENTS = `/api/v1/cases/${UPLOAD_CASE_ID}/documents`
const CONTENT = `${DOCUMENTS}/${DOCUMENT_ID}/content`

describe('ApplyPage pay stubs', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(REFERENCE)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('FR-002-17: stubs are recorded and stored against the case ID of the reference, then the application is sent', async () => {
    const calls: string[] = []
    let detail: Record<string, unknown> = {}
    let contentType: string | null = null
    signedInAs('applicant')
    respondTo(`POST ${DOCUMENTS}`, async (request) => {
      calls.push('create')
      detail = (await request.json()) as Record<string, unknown>
      return jsonResponse({ document_id: DOCUMENT_ID }, 201)
    })
    respondTo(`PUT ${CONTENT}`, (request) => {
      calls.push('content')
      contentType = request.headers.get('Content-Type')
      return new Response(null, { status: 204 })
    })
    respondTo('POST /api/v1/applications', async (request) => {
      const body = (await request.json()) as Submission
      calls.push(`submit:${body.submission_reference}`)
      return jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/applicant/apply')
    await fillApplicationWithStub(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByRole('heading', { name: /application received/i })).toBeVisible()
    expect(calls).toEqual(['create', 'content', `submit:${REFERENCE}`])
    expect(detail).toMatchObject({
      employee_name: 'Synthetic Person',
      employer: 'Synthetic Employer',
      gross_pay: '300.00',
      content_type: 'application/pdf',
    })
    expect(contentType).toBe('application/pdf')
    expect(screen.getByText(/Synthetic Employer: stub\.pdf/)).toBeVisible()
  })

  it('FR-002-17: upload failure shows the server error and keeps the stub for retry', async () => {
    const calls: string[] = []
    let contentAttempts = 0
    signedInAs('applicant')
    respondTo(`POST ${DOCUMENTS}`, () => {
      calls.push('create')
      return jsonResponse({ document_id: DOCUMENT_ID }, 201)
    })
    respondTo(`PUT ${CONTENT}`, () => {
      contentAttempts += 1
      calls.push('content')
      return contentAttempts === 1
        ? errorResponse(413, 'validation_failed', 'The file is too large. Files must be PDF.')
        : new Response(null, { status: 204 })
    })
    respondTo('POST /api/v1/applications', () => {
      calls.push('submit')
      return jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/applicant/apply')
    await fillApplicationWithStub(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByText(/The file is too large/)).toBeVisible()
    expect(calls).toEqual(['create', 'content']) // nothing submitted
    expect(screen.getByLabelText('Member 1 job 1 pay stub gross pay (USD)')).toHaveValue('300')
    expect(screen.getByLabelText('Street address')).toHaveValue('1 Test Street')

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByRole('heading', { name: /application received/i })).toBeVisible()
    // The recorded stub is not recorded twice; only its content is retried.
    expect(calls).toEqual(['create', 'content', 'content', 'submit'])
  })

  it('FR-002-17: editing a recorded stub between retries never records a second document', async () => {
    const calls: string[] = []
    signedInAs('applicant')
    respondTo(`POST ${DOCUMENTS}`, () => {
      calls.push('create')
      return jsonResponse({ document_id: DOCUMENT_ID }, 201)
    })
    respondTo(`PUT ${CONTENT}`, () => {
      calls.push('content')
      return errorResponse(500, 'internal_error', 'Something went wrong on our side.')
    })
    respondTo('POST /api/v1/applications', () => {
      calls.push('submit')
      return jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/applicant/apply')
    await fillApplicationWithStub(user)
    await user.click(screen.getByRole('button', { name: /send application/i }))
    expect(await screen.findByText(/Something went wrong on our side/)).toBeVisible()

    const gross = screen.getByLabelText('Member 1 job 1 pay stub gross pay (USD)')
    await user.clear(gross)
    await user.type(gross, '350')
    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByText(/already sent was changed/)).toBeVisible()
    expect(calls).toEqual(['create', 'content']) // no second create, nothing submitted
  })

  it('FR-002-17: create fails, the stub is edited, the retry records the edit, and a further retry unchanged goes through', async () => {
    const calls: string[] = []
    let createAttempts = 0
    let contentAttempts = 0
    signedInAs('applicant')
    respondTo(`POST ${DOCUMENTS}`, () => {
      createAttempts += 1
      calls.push('create')
      return createAttempts === 1
        ? errorResponse(500, 'internal_error', 'Something went wrong on our side.')
        : jsonResponse({ document_id: DOCUMENT_ID }, 201)
    })
    respondTo(`PUT ${CONTENT}`, () => {
      contentAttempts += 1
      calls.push('content')
      return contentAttempts === 1
        ? errorResponse(500, 'internal_error', 'Upload went wrong.')
        : new Response(null, { status: 204 })
    })
    respondTo('POST /api/v1/applications', () => {
      calls.push('submit')
      return jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/applicant/apply')
    await fillApplicationWithStub(user)
    await user.click(screen.getByRole('button', { name: /send application/i }))
    expect(await screen.findByText(/Something went wrong on our side/)).toBeVisible()

    const gross = screen.getByLabelText('Member 1 job 1 pay stub gross pay (USD)')
    await user.clear(gross)
    await user.type(gross, '350')
    await user.click(screen.getByRole('button', { name: /send application/i }))
    expect(await screen.findByText(/Upload went wrong/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByRole('heading', { name: /application received/i })).toBeVisible()
    expect(calls).toEqual(['create', 'create', 'content', 'content', 'submit'])
  })

  it('FR-002-17: a server error recording the stub (500) is shown and keeps the form', async () => {
    signedInAs('applicant')
    respondTo(`POST ${DOCUMENTS}`, () =>
      errorResponse(500, 'internal_error', 'Something went wrong on our side.'),
    )
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/applicant/apply')
    await fillApplicationWithStub(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByText(/Something went wrong on our side/)).toBeVisible()
    expect(screen.getByLabelText('Member 1 job 1 pay stub employee name')).toHaveValue(
      'Synthetic Person',
    )
  })
})
