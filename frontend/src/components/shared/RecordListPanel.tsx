import type { ReactNode } from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import { Database } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { Panel } from "@/components/shared/Panel"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DEMO_MODE } from "@/lib/demoData"
import type { RecordStatus } from "@/types"

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type RecordListPanelProps<T> = {
  title: string
  query: UseQueryResult<T[], Error>
  emptyTitle: string
  emptyDescription: string
  icon?: LucideIcon
  renderItem: (item: T) => ReactNode
}

export function RecordListPanel<T extends { id: string }>({
  title,
  query,
  emptyTitle,
  emptyDescription,
  icon = Database,
  renderItem,
}: RecordListPanelProps<T>) {
  let content: ReactNode

  if (DEMO_MODE) {
    content = (
      <EmptyState
        icon={icon}
        title="Saved records appear in live mode"
        description="Set VITE_DEMO_MODE=false in frontend/.env to load records from the backend."
      />
    )
  } else if (query.isPending) {
    content = <LoadingState rows={3} label={`Loading ${title.toLowerCase()}`} />
  } else if (query.isError) {
    content = <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
  } else if (query.data.length === 0) {
    content = <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
  } else {
    content = (
      <ul className="divide-y divide-slate-100">
        {query.data.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            {renderItem(item)}
          </li>
        ))}
      </ul>
    )
  }

  return <Panel title={title}>{content}</Panel>
}

type RecordRowProps = {
  text: string
  createdAt: string
  status: RecordStatus
  badges?: ReactNode
}

export function RecordRow({ text, createdAt, status, badges }: RecordRowProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm text-slate-700">{text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{formatDateTime(createdAt)}</span>
          {badges}
        </div>
      </div>
      <StatusBadge status={status} className="shrink-0" />
    </div>
  )
}