import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { useDocuments } from "@/hooks/useRecords"
import { DEMO_MODE } from "@/lib/demoData"
import { DocumentCard } from "./DocumentCard"

export function DocumentList() {
  const query = useDocuments()

  if (DEMO_MODE) {
    return <p className="text-sm text-slate-500">Demo mode is on. Processed documents come from the live backend.</p>
  }
  if (query.isPending) return <LoadingState rows={2} label="Loading processed documents" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No documents processed yet"
        description="Uploaded documents and their extracted items will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {query.data.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  )
}