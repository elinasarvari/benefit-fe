import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FieldProps {
  id: string
  label: string
  error?: string | undefined
  children: (aria: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
}

// One labelled control with its error text linked through aria-describedby (FE-9).
export function Field({ id, label, error, children }: FieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        ...(error === undefined ? {} : { 'aria-describedby': errorId }),
      })}
      {error === undefined ? null : (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export const fieldId = (path: string): string => path.replaceAll('.', '-')
