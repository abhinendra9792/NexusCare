import { AlertTriangle, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this information. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-red-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5 gap-2" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}