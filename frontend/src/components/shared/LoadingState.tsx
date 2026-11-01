import { Skeleton } from "@/components/ui/skeleton"

type LoadingStateProps = {
  rows?: number
  label?: string
}

export function LoadingState({ rows = 4, label = "Loading…" }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}