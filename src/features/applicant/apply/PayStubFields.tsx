import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Field, fieldId } from './Field'
import {
  FILE_RULE,
  PAY_FREQUENCIES,
  checkFile,
  type FormErrors,
  type PayFrequency,
  type StubValues,
} from './validation'

interface PayStubFieldsProps {
  path: string
  label: string
  employer: string
  stub: StubValues
  errors: FormErrors
  onChange: (stub: StubValues) => void
  onRemove: () => void
}

// The file and the five details a pay stub needs (FR-002-17, FR-002-21). The employer is the
// job's own, shown read-only (ADR-002-05).
export function PayStubFields({
  path,
  label,
  employer,
  stub,
  errors,
  onChange,
  onRemove,
}: PayStubFieldsProps) {
  const name = `${label} pay stub`
  // A refused file is flagged at once, not only on send, and the rest of the form stays.
  const fileError =
    errors[`${path}.file`] ?? (stub.file ? (checkFile(stub.file) ?? undefined) : undefined)
  return (
    <fieldset className="space-y-3 rounded-lg border border-dashed p-3">
      <legend className="px-1 text-sm font-medium">{name}</legend>
      <Field id={fieldId(`${path}.file`)} label={`${name} file`} error={fileError}>
        {(aria) => (
          <Input
            {...aria}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(event) => {
              onChange({ ...stub, file: event.target.files?.[0] ?? null })
            }}
          />
        )}
      </Field>
      <p className="text-xs text-muted-foreground">{FILE_RULE}</p>
      <Field id={fieldId(`${path}.employer`)} label={`${name} employer`}>
        {(aria) => <Input {...aria} value={employer} readOnly />}
      </Field>
      <Field
        id={fieldId(`${path}.employee_name`)}
        label={`${name} employee name`}
        error={errors[`${path}.employee_name`]}
      >
        {(aria) => (
          <Input
            {...aria}
            value={stub.employee_name}
            onChange={(event) => {
              onChange({ ...stub, employee_name: event.target.value })
            }}
          />
        )}
      </Field>
      <Field
        id={fieldId(`${path}.frequency`)}
        label={`${name} pay frequency`}
        error={errors[`${path}.frequency`]}
      >
        {(aria) => (
          <Select
            {...aria}
            value={stub.frequency}
            onChange={(event) => {
              onChange({ ...stub, frequency: event.target.value as PayFrequency | '' })
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
        id={fieldId(`${path}.gross_pay`)}
        label={`${name} gross pay (USD)`}
        error={errors[`${path}.gross_pay`]}
      >
        {(aria) => (
          <Input
            {...aria}
            inputMode="decimal"
            value={stub.gross_pay}
            onChange={(event) => {
              onChange({ ...stub, gross_pay: event.target.value })
            }}
          />
        )}
      </Field>
      <Field
        id={fieldId(`${path}.pay_date`)}
        label={`${name} pay date`}
        error={errors[`${path}.pay_date`]}
      >
        {(aria) => (
          <Input
            {...aria}
            type="date"
            value={stub.pay_date}
            onChange={(event) => {
              onChange({ ...stub, pay_date: event.target.value })
            }}
          />
        )}
      </Field>
      <Button type="button" variant="outline" size="sm" onClick={onRemove}>
        Remove {name}
      </Button>
    </fieldset>
  )
}
