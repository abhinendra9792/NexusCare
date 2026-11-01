import { AlertTriangle, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewCardHeader, SourceTextBox } from "./ReviewParts"

type FailedReviewCardProps = {
  title: string
  meta: string
  sourceText: string
  errorMessage: string | null
  busy: boolean
  retrying: boolean
  actionError: string | null
  onRetry: () => void
  onCancel: () => void
}

export function FailedReviewCard({
  title,
  meta,
  sourceText,
  errorMessage,
  busy,
  retrying,
  actionError,
  onRetry,
  onCancel,
}: FailedReviewCardProps) {
  return (
    <article className="space-y-3 rounded-xl border border-red-200 bg-white p-4">
      <ReviewCardHeader title={title} meta={meta} />
      <SourceTextBox text={sourceText} />
      <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>AI processing failed. {errorMessage ?? "Please try again."}</p>
      </div>
      {actionError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button className="gap-2 bg-teal-600 text-white hover:bg-teal-700" disabled={busy} onClick={onRetry}>
          {retrying ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          )}
          {retrying ? "Running AI again..." : "Try again"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </article>
  )
}