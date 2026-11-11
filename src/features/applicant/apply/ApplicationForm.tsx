import { useState, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from './Field'
import { MemberFields } from './MemberFields'
import {
  MAX_MEMBERS,
  emptyMember,
  toApplicationForm,
  validateForm,
  type FormErrors,
  type FormValues,
} from './validation'
import type { components } from '@/api/generated/schema'

interface ApplicationFormProps {
  values: FormValues
  onChange: (values: FormValues) => void
  onSubmit: (form: components['schemas']['ApplicationForm']) => void
  pending: boolean
}

export function ApplicationForm({ values, onChange, onSubmit, pending }: ApplicationFormProps) {
  const [errors, setErrors] = useState<FormErrors>({})

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const found = validateForm(values)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      onSubmit(toApplicationForm(values))
    }
  }

  const { address } = values
  const messages = Object.values(errors)

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6" aria-label="Application">
      {messages.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/40 p-3">
          <p className="font-medium text-destructive">Please fix these before sending:</p>
          <ul className="list-disc pl-5 text-sm">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <section aria-labelledby="household-heading" className="space-y-4">
        <h2 id="household-heading" className="text-lg font-semibold">
          Household members
        </h2>
        {errors.members ? (
          <p id="members-error" className="text-sm text-destructive">
            {errors.members}
          </p>
        ) : null}
        {values.members.map((member, index) => (
          <MemberFields
            key={index}
            index={index}
            member={member}
            errors={errors}
            canRemove={values.members.length > 1}
            onChange={(next) => {
              onChange({
                ...values,
                members: values.members.map((m, i) => (i === index ? next : m)),
              })
            }}
            onRemove={() => {
              onChange({ ...values, members: values.members.filter((_, i) => i !== index) })
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={values.members.length >= MAX_MEMBERS}
          onClick={() => {
            onChange({ ...values, members: [...values.members, emptyMember()] })
          }}
        >
          Add a household member
        </Button>
      </section>
      <section aria-labelledby="address-heading" className="space-y-3">
        <h2 id="address-heading" className="text-lg font-semibold">
          Illinois address
        </h2>
        <Field id="address-line1" label="Street address" error={errors['address.line1']}>
          {(aria) => (
            <Input
              {...aria}
              autoComplete="address-line1"
              value={address.line1}
              onChange={(event) => {
                onChange({ ...values, address: { ...address, line1: event.target.value } })
              }}
            />
          )}
        </Field>
        <Field
          id="address-line2"
          label="Apartment or unit (optional)"
          error={errors['address.line2']}
        >
          {(aria) => (
            <Input
              {...aria}
              autoComplete="address-line2"
              value={address.line2}
              onChange={(event) => {
                onChange({ ...values, address: { ...address, line2: event.target.value } })
              }}
            />
          )}
        </Field>
        <Field id="address-city" label="City" error={errors['address.city']}>
          {(aria) => (
            <Input
              {...aria}
              autoComplete="address-level2"
              value={address.city}
              onChange={(event) => {
                onChange({ ...values, address: { ...address, city: event.target.value } })
              }}
            />
          )}
        </Field>
        <p className="text-sm">State: Illinois (IL)</p>
        <Field id="address-postal_code" label="ZIP code" error={errors['address.postal_code']}>
          {(aria) => (
            <Input
              {...aria}
              autoComplete="postal-code"
              inputMode="numeric"
              value={address.postal_code}
              onChange={(event) => {
                onChange({ ...values, address: { ...address, postal_code: event.target.value } })
              }}
            />
          )}
        </Field>
      </section>
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send application'}
      </Button>
    </form>
  )
}
