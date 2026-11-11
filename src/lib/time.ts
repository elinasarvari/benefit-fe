const TIME_ZONE = 'America/Chicago'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

export function formatDate(value: Date | string): string {
  return dateFormat.format(new Date(value))
}

// A calendar day such as "2026-05-01" has no time zone: format it at noon so it never shifts a day.
export function formatCalendarDate(iso: string): string {
  return formatDate(`${iso}T12:00:00Z`)
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormat.format(new Date(value))
}
