import { ShieldCheck } from "lucide-react"
import { DemoDataBadge } from "@/components/shared/DemoDataBadge"
import { EmergencyBanner } from "@/components/shared/EmergencyBanner"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { NoteInputForm, type NoteSourceType } from "@/components/shared/NoteInputForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { RecentAppointmentsTable } from "@/features/dashboard/RecentAppointmentsTable"
import { useAppointments, useCreateAppointment } from "@/hooks/useAppointments"
import { DEMO_MODE } from "@/lib/demoData"
import { mayBeEmergency } from "@/lib/emergency"

const rules = [
  "Missing details are flagged, never invented.",
  "A requested date is not a confirmed booking.",
  'Vague dates like "next week" are marked for clarification.',
  "Nothing is approved until a staff member reviews it.",
]

export default function AppointmentsPage() {
  const appointmentsQuery = useAppointments()
  const createAppointment = useCreateAppointment()

  async function saveDraft(note: string, sourceType: NoteSourceType) {
    await createAppointment.mutateAsync({ sourceText: note, sourceType })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment requests"
        description="Turn a patient or caregiver note into a structured, reviewable appointment request."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="New request" className="lg:col-span-2">
          <NoteInputForm
            id="appointment-note"
            label="Patient or caregiver note"
            placeholder="e.g. Hi, this is Priya calling for my father (ref PT-1042). He needs a follow-up after his blood test, ideally next Tuesday morning. Please call me back on my mobile."
            helpText="Use fictional details only. Type the note or record it with your voice."
                        submitLabel={DEMO_MODE ? "Generate request" : "Generate with AI"}
            onSubmitNote={DEMO_MODE ? undefined : saveDraft}
                        successMessage="AI draft ready. It is awaiting review below, and nothing is approved until a staff member checks it."
            enableVoice
            renderWarning={(text) => (mayBeEmergency(text) ? <EmergencyBanner /> : null)}
          />
        </Panel>

        <Panel title="How this works">
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule} className="flex gap-2 text-sm text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                {rule}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Recent requests" action={<DemoDataBadge />}>
        {appointmentsQuery.isPending ? (
          <LoadingState rows={4} label="Loading appointment requests" />
        ) : appointmentsQuery.isError ? (
          <ErrorState message={appointmentsQuery.error.message} onRetry={() => appointmentsQuery.refetch()} />
        ) : appointmentsQuery.data.length > 0 ? (
          <RecentAppointmentsTable appointments={appointmentsQuery.data} />
        ) : (
          <EmptyState title="No appointment requests yet" description="Saved requests will appear here." />
        )}
      </Panel>
    </div>
  )
}
