import { cn } from "@/lib/utils"
import type { RecordStatus } from "@/types"

const statusStyles: Record<RecordStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  processing: { label: "Processing", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  awaiting_review: { label: "Awaiting review", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  approved: { label: "Approved", className: "bg-teal-50 text-teal-700 ring-teal-200" },
  rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 ring-rose-200" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 ring-red-200" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 ring-slate-200" },
}

export function getStatusLabel(status: RecordStatus): string {
  return statusStyles[status].label
}

type StatusBadgeProps = {
  status: RecordStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  )
}