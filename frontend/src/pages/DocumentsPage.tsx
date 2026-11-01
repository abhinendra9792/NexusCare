import { CalendarClock, FileSearch, ListTodo, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { RecordListPanel, formatDateTime } from "@/components/shared/RecordListPanel"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PdfUploader } from "@/features/documents/PdfUploader"
import { useDocuments, useUploadDocument } from "@/hooks/useRecords"
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
  const documentsQuery = useDocuments()
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

      <RecordListPanel
        title="Processed documents"
        query={documentsQuery}
        icon={FileSearch}
        emptyTitle="No documents processed yet"
        emptyDescription="Uploaded documents and their extracted items will appear here."
        renderItem={(doc) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{doc.originalFilename}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {doc.pageCount ?? 0} page(s), {(doc.extractedCharCount ?? 0).toLocaleString()} characters,{" "}
                {formatDateTime(doc.createdAt)}
              </p>
              {doc.textPreview && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{doc.textPreview}</p>}
            </div>
            <StatusBadge status={doc.status} className="shrink-0" />
          </div>
        )}
      />
    </div>
  )
}