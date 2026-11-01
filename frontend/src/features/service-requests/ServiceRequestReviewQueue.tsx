import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { useServiceRequests } from "@/hooks/useRecords"
import { DEMO_MODE } from "@/lib/demoData"
import { ServiceRequestReviewCard } from "./ServiceRequestReviewCard"

const NEEDS_ATTENTION = new Set(["awaiting_review", "failed"])

export function ServiceRequestReviewQueue() {
  const query = useServiceRequests()

  if (DEMO_MODE) {
    return <p className="text-sm text-slate-500">Demo mode is on. The review queue uses live data from the backend.</p>
  }
  if (query.isPending) return <LoadingState rows={2} label="Loading inquiries to review" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  // Possible emergencies are shown first.
  const queue = query.data
    .filter((record) => NEEDS_ATTENTION.has(record.status))
    .sort((a, b) => Number(b.possibleEmergency) - Number(a.possibleEmergency))

  if (queue.length === 0) {
    return <EmptyState title="Nothing to review" description="New AI classifications will appear here for review." />
  }

  return (
    <div className="space-y-4">
      {queue.map((record) => (
        <ServiceRequestReviewCard key={`${record.id}-${record.updatedAt}`} record={record} />
      ))}
    </div>
  )
}