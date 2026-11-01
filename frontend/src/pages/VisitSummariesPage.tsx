import { CircleDot, FileText, Lightbulb } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { NoteInputForm } from "@/components/shared/NoteInputForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"

const sections = [
  "Visit purpose",
  "Key points mentioned",
  "Facts reported in the notes",
  "Follow-up actions (mentioned or suggested)",
  "Missing information",
  "Items needing staff verification",
]

export default function VisitSummariesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visit summaries"
        description="Generate a structured summary from visit notes. The AI organises what's written; it never diagnoses or adds clinical details."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Visit notes" className="lg:col-span-2">
          <NoteInputForm
            id="visit-notes"
            label="Notes from the visit"
            placeholder="e.g. PT-0931 attended a routine review. Reported sleeping better since the last visit. Asked about repeat physiotherapy sessions. Wants last month's report sent by email."
            helpText="Use fictional details only. Only information in these notes will be used."
            submitLabel="Generate summary"
            enableVoice
          />
        </Panel>

        <Panel title="The summary will include">
          <ul className="space-y-2">
            {sections.map((section) => (
              <li key={section} className="flex gap-2 text-sm text-slate-600">
                <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                {section}
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Labels you'll see</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-200">
                <FileText className="h-3 w-3" aria-hidden="true" />
                From your notes
              </span>
              <span className="text-xs text-slate-500">Stated in the source</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                <Lightbulb className="h-3 w-3" aria-hidden="true" />
                AI suggestion
              </span>
              <span className="text-xs text-slate-500">Needs staff judgement</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Saved summaries">
        <EmptyState
          icon={FileText}
          title="No summaries yet"
          description="Approved visit summaries will appear here."
        />
      </Panel>
    </div>
  )
}