import { Link } from "react-router"
import { CalendarPlus, ClipboardList, FileUp, Inbox, ListChecks } from "lucide-react"

const actions = [
  { label: "New appointment request", description: "From a note or voice", path: "/appointments", icon: CalendarPlus },
  { label: "Upload a document", description: "Extract details from a PDF", path: "/documents", icon: FileUp },
  { label: "Summarise a visit", description: "Turn notes into a summary", path: "/visit-summaries", icon: ClipboardList },
  { label: "Create a care plan", description: "Generate follow-up tasks", path: "/care-plans", icon: ListChecks },
  { label: "Route an inquiry", description: "Find the right department", path: "/service-requests", icon: Inbox },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">      {actions.map(({ label, description, path, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-900">{label}</span>
            <span className="block text-xs text-slate-500">{description}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}