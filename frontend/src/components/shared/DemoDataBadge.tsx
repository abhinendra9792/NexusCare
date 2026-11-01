import { FlaskConical } from "lucide-react"
import { DEMO_MODE } from "@/lib/demoData"

export function DemoDataBadge() {
  if (!DEMO_MODE) return null
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
      title="This section shows fictional sample data, not real records."
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Demo data
    </span>
  )
}