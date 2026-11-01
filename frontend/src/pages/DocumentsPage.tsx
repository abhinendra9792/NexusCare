import { CalendarClock, FileSearch, ListTodo, ShieldCheck } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { PdfUploader } from "@/features/documents/PdfUploader"

const extracted = [
  { icon: CalendarClock, title: "Appointment details", description: "Dates, times, department, location, and purpose" },
  { icon: ListTodo, title: "Follow-up actions", description: "Tasks mentioned in the document, with due dates if stated" },
]

const safeguards = [
  "Each extracted item is reviewed separately.",
  "Instructions written inside a document are ignored.",
  "Files are deleted after the text is extracted.",
  "Scanned or image-only PDFs are rejected with a clear message.",
]

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Document intelligence"
        description="Upload a PDF to extract appointment details and follow-up actions for review."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Upload a PDF" className="lg:col-span-2">
          <PdfUploader />
        </Panel>

        <Panel title="What gets extracted">
          <ul className="space-y-3">
            {extracted.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Safeguards</p>
            {safeguards.map((item) => (
              <p key={item} className="flex gap-2 text-xs text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Processed documents">
        <EmptyState
          icon={FileSearch}
          title="No documents processed yet"
          description="Uploaded documents and their extracted items will appear here."
        />
      </Panel>
    </div>
  )
}
