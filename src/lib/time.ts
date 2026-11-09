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

export function formatDateTime(value: Date | string): string {
  return dateTimeFormat.format(new Date(value))
}
