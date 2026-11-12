import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Field, fieldId } from './Field'
import { PayStubFields } from './PayStubFields'
import {
  PAY_FREQUENCIES,
  emptyStub,
  type FormErrors,
  type JobValues,
  type PayFrequency,
} from './validation'

interface JobFieldsProps {
  path: string
  label: string
  job: JobValues
  errors: FormErrors
  onChange: (job: JobValues) => void
  onRemove: () => void
}

export function JobFields({ path, label, job, errors, onChange, onRemove }: JobFieldsProps) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <Field
        id={fieldId(`${path}.employer`)}
        label={`${label} employer`}
        error={errors[`${path}.employer`]}
      >
        {(aria) => (
          <Input
            {...aria}
            value={job.employer}
            onChange={(event) => {
              onChange({ ...job, employer: event.target.value })
            }}
          />
        )}
      </Field>
      <Field
        id={fieldId(`${path}.pay_frequency`)}
        label={`${label} pay frequency`}
        error={errors[`${path}.pay_frequency`]}
      >
        {(aria) => (
          <Select
            {...aria}
            value={job.pay_frequency}
            onChange={(event) => {
              onChange({ ...job, pay_frequency: event.target.value as PayFrequency | '' })
            }}
          >
            <option value="">Choose…</option>
            {PAY_FREQUENCIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id={fieldId(`${path}.declared_monthly_gross`)}
        label={`${label} monthly gross income (USD)`}
        error={errors[`${path}.declared_monthly_gross`]}
      >
        {(aria) => (
          <Input
            {...aria}
            inputMode="decimal"
            value={job.declared_monthly_gross}
            onChange={(event) => {
              onChange({ ...job, declared_monthly_gross: event.target.value })
            }}
          />
        )}
      </Field>
      {job.stub ? (
        <PayStubFields
          path={`${path}.stub`}
          label={label}
          employer={job.employer.trim()}
          stub={job.stub}
          errors={errors}
          onChange={(stub) => {
            onChange({ ...job, stub })
          }}
          onRemove={() => {
            onChange({ ...job, stub: null })
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange({ ...job, stub: emptyStub() })
          }}
        >
          Add a pay stub for {label}
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onRemove}>
        Remove {label}
      </Button>
    </fieldset>
  )
}
