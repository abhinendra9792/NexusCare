import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { useAppointmentRecords } from "@/hooks/useAppointments"
import { DEMO_MODE } from "@/lib/demoData"
import { AppointmentReviewCard } from "./AppointmentReviewCard"

const NEEDS_ATTENTION = new Set(["awaiting_review", "failed"])

export function AppointmentReviewQueue() {
  const query = useAppointmentRecords()

  if (DEMO_MODE) {
    return <p className="text-sm text-slate-500">Demo mode is on. The review queue uses live data from the backend.</p>
  }
  if (query.isPending) return <LoadingState rows={2} label="Loading requests to review" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  const queue = query.data.filter((record) => NEEDS_ATTENTION.has(record.status))
  if (queue.length === 0) {
    return <EmptyState title="Nothing to review" description="New AI drafts will appear here for review." />
  }

  return (
    <div className="space-y-4">
      {queue.map((record) => (
        // updatedAt in the key resets the form after each save, retry, or status change.
        <AppointmentReviewCard key={`${record.id}-${record.updatedAt}`} record={record} />
      ))}
    </div>
  )
}