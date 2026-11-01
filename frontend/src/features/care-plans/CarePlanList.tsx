import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { useCarePlans } from "@/hooks/useRecords"
import { CarePlanCard } from "./CarePlanCard"

// Plans needing attention first, then approved plans being worked on.
const ORDER: Record<string, number> = { failed: 0, awaiting_review: 1, approved: 2 }

export function CarePlanList() {
  const query = useCarePlans()

  if (query.isPending) return <LoadingState rows={2} label="Loading care plans" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  const plans = query.data
    .filter((plan) => plan.status in ORDER)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status])

  if (plans.length === 0) {
    return <EmptyState title="No care plans yet" description="Generate tasks from progress notes to get started." />
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <CarePlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  )
}