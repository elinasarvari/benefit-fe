import { useRef, useState } from 'react'
import { useMe } from '@/api/auth'
import { useSubmitApplication, type CaseStatus } from '@/api/cases'
import { ApiError } from '@/api/errors'
import type { components } from '@/api/generated/schema'
import { ErrorState } from '@/components/ErrorState'
import { PageHeading } from '@/components/PageHeading'
import { ReauthDialog } from '@/features/auth/ReauthDialog'
import { ApplicationForm } from './ApplicationForm'
import { Confirmation } from './Confirmation'
import { RefusalPanel } from './RefusalPanel'
import { emptyForm, type FormValues } from './validation'

type Form = components['schemas']['ApplicationForm']

interface Refusal {
  reason: string
  relatedCaseId: string | null
}

export function ApplyPage() {
  const me = useMe()
  const submit = useSubmitApplication()
  // Entries live in memory only: nothing goes to browser storage (ADR-001-10, constitution VIII).
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [confirmed, setConfirmed] = useState<CaseStatus | null>(null)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [reauth, setReauth] = useState(false)
  // One reference per form instance: a retry or a double click is the same submission (FR-001-23).
  const [reference, setReference] = useState(() => crypto.randomUUID())
  const inFlight = useRef(false)
  const pendingForm = useRef<Form | null>(null)
  const submittedBy = useRef<string | null>(null)

  const send = (form: Form, submissionReference: string): void => {
    if (inFlight.current) {
      return
    }
    inFlight.current = true
    pendingForm.current = form
    submittedBy.current ??= me.data?.user.id ?? null
    setError(null)
    setRefusal(null)
    submit.mutate(
      { submission_reference: submissionReference, form },
      {
        onSuccess: (status) => {
          setConfirmed(status)
        },
        onError: (failure) => {
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
        },
        onSettled: () => {
          inFlight.current = false
        },
      },
    )
  }

  const handleSignedIn = (userId: string): void => {
    setReauth(false)
    if (userId === submittedBy.current && pendingForm.current) {
      send(pendingForm.current, reference)
      return
    }
    // Someone else signed in: never carry the first person's entries over.
    pendingForm.current = null
    submittedBy.current = null
    setValues(emptyForm())
    setReference(crypto.randomUUID())
    setError(null)
  }

  if (confirmed) {
    return (
      <section className="space-y-4">
        <PageHeading>Apply for coverage</PageHeading>
        <Confirmation status={confirmed} />
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
      {error ? <ErrorState error={error} /> : null}
      <ApplicationForm
        values={values}
        onChange={setValues}
        onSubmit={(form) => {
          send(form, reference)
        }}
        pending={submit.isPending}
      />
      <ReauthDialog open={reauth} onSignedIn={handleSignedIn} />
    </section>
  )
}
