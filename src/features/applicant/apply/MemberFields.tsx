import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Field, fieldId } from './Field'
import { JobFields } from './JobFields'
import {
  CITIZENSHIP,
  MAX_JOBS,
  RELATIONSHIPS,
  emptyJob,
  type CitizenshipStatus,
  type FormErrors,
  type MemberValues,
  type Relationship,
} from './validation'

interface MemberFieldsProps {
  index: number
  member: MemberValues
  errors: FormErrors
  canRemove: boolean
  onChange: (member: MemberValues) => void
  onRemove: () => void
}

export function MemberFields({
  index,
  member,
  errors,
  canRemove,
  onChange,
  onRemove,
}: MemberFieldsProps) {
  const path = `members.${String(index)}`
  const label = `Member ${String(index + 1)}`
  const jobsError = errors[`${path}.jobs`]
  const citizenshipError = errors[`${path}.citizenship_status`]
  const citizenshipId = fieldId(`${path}.citizenship_status`)

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 font-medium">{label}</legend>
      <Field
        id={fieldId(`${path}.full_name`)}
        label={`${label} full name`}
        error={errors[`${path}.full_name`]}
      >
        {(aria) => (
          <Input
            {...aria}
            value={member.full_name}
            onChange={(event) => {
              onChange({ ...member, full_name: event.target.value })
            }}
          />
        )}
      </Field>
      <Field
        id={fieldId(`${path}.date_of_birth`)}
        label={`${label} date of birth`}
        error={errors[`${path}.date_of_birth`]}
      >
        {(aria) => (
          <Input
            {...aria}
            type="date"
            value={member.date_of_birth}
            onChange={(event) => {
              onChange({ ...member, date_of_birth: event.target.value })
            }}
          />
        )}
      </Field>
      <Field
        id={fieldId(`${path}.relationship`)}
        label={`${label} relationship to you`}
        error={errors[`${path}.relationship`]}
      >
        {(aria) => (
          <Select
            {...aria}
            value={member.relationship}
            onChange={(event) => {
              onChange({ ...member, relationship: event.target.value as Relationship | '' })
            }}
          >
            <option value="">Choose…</option>
            {RELATIONSHIPS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="space-y-1">
        <p id={`${citizenshipId}-label`} className="text-sm font-medium">
          {label} citizenship status
        </p>
        <RadioGroup
          aria-labelledby={`${citizenshipId}-label`}
          aria-invalid={citizenshipError !== undefined}
          {...(citizenshipError === undefined
            ? {}
            : { 'aria-describedby': `${citizenshipId}-error` })}
          value={member.citizenship_status}
          onValueChange={(value) => {
            onChange({ ...member, citizenship_status: value as CitizenshipStatus })
          }}
        >
          {CITIZENSHIP.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem id={`${citizenshipId}-${option.value}`} value={option.value} />
              <Label htmlFor={`${citizenshipId}-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {citizenshipError === undefined ? null : (
          <p id={`${citizenshipId}-error`} className="text-sm text-destructive">
            {citizenshipError}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={fieldId(`${path}.medicare_entitled`)}
          checked={member.medicare_entitled}
          onCheckedChange={(checked) => {
            onChange({ ...member, medicare_entitled: checked === true })
          }}
        />
        <Label htmlFor={fieldId(`${path}.medicare_entitled`)}>
          {label} is entitled to Medicare
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={fieldId(`${path}.zero_income`)}
          checked={member.zero_income}
          aria-invalid={jobsError !== undefined}
          {...(jobsError === undefined
            ? {}
            : { 'aria-describedby': `${fieldId(path)}-jobs-error` })}
          onCheckedChange={(checked) => {
            onChange({ ...member, zero_income: checked === true })
          }}
        />
        <Label htmlFor={fieldId(`${path}.zero_income`)}>{label} has no income</Label>
      </div>
      {member.jobs.map((job, jobIndex) => (
        <JobFields
          key={jobIndex}
          path={`${path}.jobs.${String(jobIndex)}`}
          label={`${label} job ${String(jobIndex + 1)}`}
          job={job}
          errors={errors}
          onChange={(next) => {
            onChange({ ...member, jobs: member.jobs.map((j, i) => (i === jobIndex ? next : j)) })
          }}
          onRemove={() => {
            onChange({ ...member, jobs: member.jobs.filter((_, i) => i !== jobIndex) })
          }}
        />
      ))}
      {jobsError === undefined ? null : (
        <p id={`${fieldId(path)}-jobs-error`} className="text-sm text-destructive">
          {jobsError}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={member.jobs.length >= MAX_JOBS}
          onClick={() => {
            onChange({ ...member, jobs: [...member.jobs, emptyJob()] })
          }}
        >
          Add a job for {label}
        </Button>
        {canRemove ? (
          <Button type="button" variant="outline" size="sm" onClick={onRemove}>
            Remove {label}
          </Button>
        ) : null}
      </div>
    </fieldset>
  )
}
