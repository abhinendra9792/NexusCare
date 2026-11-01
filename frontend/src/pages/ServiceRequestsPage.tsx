import { Building2, Inbox, Siren } from "lucide-react"
import { EmergencyBanner } from "@/components/shared/EmergencyBanner"
import { NoteInputForm } from "@/components/shared/NoteInputForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { RecordListPanel, RecordRow } from "@/components/shared/RecordListPanel"
import { useCreateServiceRequest, useServiceRequests } from "@/hooks/useRecords"
import { DEMO_MODE } from "@/lib/demoData"
import { mayBeEmergency } from "@/lib/emergency"

const departments = [
  { name: "Appointment Desk", description: "Booking, rescheduling, and cancellations" },
  { name: "Billing", description: "Invoices, payments, and insurance claims" },
  { name: "Medical Records", description: "Copies of reports and record requests" },
  { name: "Technical Support", description: "Portal login and app problems" },
  { name: "General Support", description: "Directions, opening hours, general questions" },
  { name: "Other / Needs Review", description: "Anything unclear; a person decides" },
]

export default function ServiceRequestsPage() {
  const requestsQuery = useServiceRequests()
  const createRequest = useCreateServiceRequest()

  async function saveDraft(note: string) {
    await createRequest.mutateAsync(note)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service request routing"
        description="Categorise an administrative inquiry and suggest the right department. This is not medical triage."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="New inquiry" className="lg:col-span-2">
          <NoteInputForm
            id="service-inquiry"
            label="Inquiry message"
            placeholder="e.g. I was charged twice for my visit on 12 October. Can someone check my invoice?"
            helpText="Use fictional details only. Staff can correct the suggested department before approving."
            submitLabel={DEMO_MODE ? "Classify inquiry" : "Save as draft"}
            onSubmitNote={DEMO_MODE ? undefined : saveDraft}
            successMessage="Saved as a draft. AI classification will be added in Phase 6, and staff approve every routing decision."
            minLength={10}
            renderWarning={(text) => (mayBeEmergency(text) ? <EmergencyBanner /> : null)}
          />
        </Panel>

        <Panel title="Departments">
          <ul className="space-y-3">
            {departments.map((department) => (
              <li key={department.name} className="flex gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{department.name}</p>
                  <p className="text-xs text-slate-500">{department.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <RecordListPanel
        title="Service requests"
        query={requestsQuery}
        icon={Inbox}
        emptyTitle="No service requests yet"
        emptyDescription="Saved inquiries and approved routing decisions will appear here."
        renderItem={(item) => (
          <RecordRow
            text={item.sourceText}
            createdAt={item.createdAt}
            status={item.status}
            badges={
              item.possibleEmergency ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-inset ring-red-200">
                  <Siren className="h-3 w-3" aria-hidden="true" />
                  Possible emergency
                </span>
              ) : null
            }
          />
        )}
      />
    </div>
  )
}