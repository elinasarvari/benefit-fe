import { useRef, useState } from 'react'
import { useMe } from '@/api/auth'
import { useSubmitApplication, type CaseStatus } from '@/api/cases'
import { useCreatePayStub, useUploadPayStubContent } from '@/api/documents'
import { ApiError } from '@/api/errors'
import type { components } from '@/api/generated/schema'
import { ErrorState } from '@/components/ErrorState'
import { PageHeading } from '@/components/PageHeading'
import { ReauthDialog } from '@/features/auth/ReauthDialog'
import { caseIdFor } from '@/lib/caseId'
import { ApplicationForm } from './ApplicationForm'
import { Confirmation, type SentStub } from './Confirmation'
import { RefusalPanel } from './RefusalPanel'
import { emptyForm, type FormValues, type StubUpload } from './validation'

type Form = components['schemas']['ApplicationForm']

interface Refusal {
  reason: string
  relatedCaseId: string | null
}

interface Stored {
  documentId: string | null
  stored: boolean
  // What was recorded: a recorded stub cannot be changed, so an edit must not record a second one.
  signature: string
}

// One entry per stub, by its own ID. The server has no way to replace or remove a recorded stub, so
// a stub whose details or file changed after it was recorded is refused rather than recorded again.
const stubSignature = (stub: StubUpload): string =>
  `${JSON.stringify(stub.body)}|${String(stub.file.lastModified)}`

export const STUB_CHANGED_MESSAGE =
  'A pay stub that was already sent was changed. Put its details back, or reload the page to start again.'

export function ApplyPage() {
  const me = useMe()
  const submit = useSubmitApplication()
  // Entries live in memory only: nothing goes to browser storage (ADR-001-10, constitution VIII).
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [confirmed, setConfirmed] = useState<CaseStatus | null>(null)
  const [sentStubs, setSentStubs] = useState<SentStub[]>([])
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reauth, setReauth] = useState(false)
  const createStub = useCreatePayStub()
  const uploadContent = useUploadPayStubContent()
  // One reference per form instance: a retry or a double click is the same submission (FR-001-23).
  const [reference, setReference] = useState(() => crypto.randomUUID())
  const inFlight = useRef(false)
  const pendingForm = useRef<Form | null>(null)
  const pendingStubs = useRef<StubUpload[]>([])
  const stored = useRef(new Map<string, Stored>())
  const submittedBy = useRef<string | null>(null)

  const fail = (failure: unknown): void => {
    if (failure instanceof ApiError && failure.status === 401) {
      setReauth(true)
    } else if (failure instanceof ApiError && failure.status === 409) {
      setRefusal({
        reason: failure.fields[0]?.type ?? 'unknown',
        relatedCaseId: failure.relatedCaseId,
      })
    } else {
      setError(failure)
    }
  }

  // Pay stubs go first, against the case ID this reference will produce (ADR-002-01).
  const uploadStubs = async (stubs: StubUpload[], submissionReference: string): Promise<void> => {
    if (stubs.length === 0) {
      return
    }
    const caseId = await caseIdFor(submissionReference)
    for (const stub of stubs) {
      const signature = stubSignature(stub)
      const entry = stored.current.get(stub.id) ?? { documentId: null, stored: false, signature }
      stored.current.set(stub.id, entry)
      if (entry.documentId !== null && entry.signature !== signature) {
        throw new Error(STUB_CHANGED_MESSAGE)
      }
      if (entry.documentId === null) {
        entry.documentId = await createStub.mutateAsync({ caseId, body: stub.body })
        // The signature names what was actually recorded, not what the first attempt tried.
        entry.signature = signature
      }
      if (!entry.stored) {
        await uploadContent.mutateAsync({ caseId, documentId: entry.documentId, file: stub.file })
        entry.stored = true
      }
    }
  }

  const send = (form: Form, stubs: StubUpload[], submissionReference: string): void => {
    if (inFlight.current) {
      return
    }
    inFlight.current = true
    pendingForm.current = form
    pendingStubs.current = stubs
    submittedBy.current ??= me.data?.user.id ?? null
    setError(null)
    setRefusal(null)
    uploadStubs(stubs, submissionReference)
      .then(() => {
        submit.mutate(
          { submission_reference: submissionReference, form },
          {
            onSuccess: (status) => {
              setSentStubs(
                stubs.map((stub) => ({ employer: stub.body.employer, fileName: stub.file.name })),
              )
              setConfirmed(status)
            },
            onError: fail,
            onSettled: () => {
              inFlight.current = false
            },
          },
        )
      })
      .catch((failure: unknown) => {
        // The stubs already recorded stay recorded; the form and the files stay for a retry.
        inFlight.current = false
        fail(failure)
      })
  }

  const handleSignedIn = (userId: string): void => {
    setReauth(false)
    if (userId === submittedBy.current && pendingForm.current) {
      send(pendingForm.current, pendingStubs.current, reference)
      return
    }
    // Someone else signed in: never carry the first person's entries over.
    pendingForm.current = null
    pendingStubs.current = []
    stored.current.clear()
    submittedBy.current = null
    setValues(emptyForm())
    setReference(crypto.randomUUID())
    setError(null)
  }

  if (confirmed) {
    return (
      <section className="space-y-4">
        <PageHeading>Apply for coverage</PageHeading>
        <Confirmation status={confirmed} stubs={sentStubs} />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <PageHeading>Apply for coverage</PageHeading>
      <p className="text-sm text-muted-foreground">
        This is a demonstration with synthetic data. Do not enter real personal details.
      </p>
      {refusal ? (
        <RefusalPanel reason={refusal.reason} relatedCaseId={refusal.relatedCaseId} />
      ) : null}
      {error instanceof Error && error.message === STUB_CHANGED_MESSAGE ? (
        <p role="alert" className="font-medium text-destructive">
          {STUB_CHANGED_MESSAGE}
        </p>
      ) : error ? (
        <ErrorState error={error} />
      ) : null}
      <ApplicationForm
        values={values}
        onChange={setValues}
        onSubmit={(form, stubs) => {
          send(form, stubs, reference)
        }}
        pending={submit.isPending || createStub.isPending || uploadContent.isPending}
      />
      <ReauthDialog open={reauth} onSignedIn={handleSignedIn} />
    </section>
  )
}
