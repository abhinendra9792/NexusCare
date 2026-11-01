import { CalendarClock, ListTodo, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { DocumentList } from "@/features/documents/DocumentList"
import { PdfUploader } from "@/features/documents/PdfUploader"
import { useUploadDocument } from "@/hooks/useRecords"
import { DEMO_MODE } from "@/lib/demoData"

const extracted = [
  { icon: CalendarClock, title: "Appointment details", description: "Dates, times, department, location, and purpose" },
  { icon: ListTodo, title: "Follow-up actions", description: "Tasks mentioned in the document, with due dates if stated" },
]

const safeguards = [
  "The server re-checks every file: type, size, PDF header, and page count.",
  "The PDF itself is never stored; only the extracted text preview is kept.",
  "Instructions written inside a document are ignored.",
  "Scanned or image-only PDFs are rejected with a clear message.",
]

export default function DocumentsPage() {
  const uploadDocument = useUploadDocument()

  async function upload(file: File) {
    const job = await uploadDocument.mutateAsync(file)
    return { pageCount: job.pageCount, extractedCharCount: job.extractedCharCount }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document intelligence"
        description="Upload a PDF to extract appointment details and follow-up actions for review."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Upload a PDF" className="lg:col-span-2">
          <PdfUploader onUpload={DEMO_MODE ? undefined : upload} />
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
        <DocumentList />
      </Panel>
    </div>
  )
}