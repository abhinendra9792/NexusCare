import { useState } from "react"
import { History, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DemoDataBadge } from "@/components/shared/DemoDataBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { DEMO_MODE, demoActivity } from "@/lib/demoData"

const entityLabels: Record<string, string> = {
  appointment_request: "Appointment",
  document_job: "Document",
  visit_summary: "Visit summary",
  care_plan: "Care plan",
  service_request: "Service request",
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function ActivityLogPage() {
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")

  const items = DEMO_MODE ? demoActivity : []
  const query = search.trim().toLowerCase()
  const filtered = items.filter((item) => {
    const matchesType = entityFilter === "all" || item.entityType === entityFilter
    const matchesSearch =
      query === "" ||
      item.summary.toLowerCase().includes(query) ||
      item.action.toLowerCase().includes(query)
    return matchesType && matchesSearch
  })

  function clearFilters() {
    setSearch("")
    setEntityFilter("all")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="Every create, approve, reject, and failure event. Patient details are never stored here."
        badge={<DemoDataBadge />}
      />

      <Panel title="Events">
        {items.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Actions taken in NexusCare will be recorded here." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search activity…"
                  aria-label="Search activity"
                  className="pl-9"
                />
              </div>
              <select
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value)}
                aria-label="Filter by record type"
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <option value="all">All record types</option>
                {Object.entries(entityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matching activity"
                description="Try a different search term or record type."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead className="hidden sm:table-cell">Record type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-slate-600">{formatTimestamp(item.createdAt)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{entityLabels[item.entityType] ?? item.entityType}</TableCell>
                      <TableCell className="font-medium">{capitalise(item.action)}</TableCell>
                      <TableCell className="hidden max-w-[320px] truncate text-slate-600 md:table-cell">{item.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-slate-400">
              Showing {filtered.length} of {items.length} events
            </p>
          </div>
        )}
      </Panel>
    </div>
  )
}