import type { ActivityEntry } from "@/types"

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type RecentActivityProps = {
  items: ActivityEntry[]
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-slate-700">{item.summary}</p>
            <p className="text-xs text-slate-400">{formatTimestamp(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}