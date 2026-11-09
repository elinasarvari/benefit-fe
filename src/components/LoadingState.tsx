export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="text-muted-foreground">
      {label}
    </p>
  )
}
