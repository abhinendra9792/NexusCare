import { ShieldCheck } from "lucide-react"
import { DemoDataBadge } from "@/components/shared/DemoDataBadge"
import { NoteInputForm } from "@/components/shared/NoteInputForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { CarePlanList } from "@/features/care-plans/CarePlanList"
import { TaskChecklist } from "@/features/care-plans/TaskChecklist"
import { useCreateCarePlan } from "@/hooks/useRecords"
import { DEMO_MODE, demoCarePlanTasks } from "@/lib/demoData"

const rules = [
  'AI-generated tasks start as "Needs review".',
  "Due dates are only suggested when the notes support them.",
  "An approved care plan is never changed automatically.",
  "Tasks are administrative, never clinical instructions.",
]

export default function CarePlansPage() {
  const createPlan = useCreateCarePlan()

  async function generateTasks(note: string) {
    await createPlan.mutateAsync({ sourceText: note })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care-plan checklists"
        description="Turn progress notes into proposed administrative follow-up tasks for staff to review."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Progress notes" className="lg:col-span-2">
          <NoteInputForm
            id="progress-notes"
            label="Progress notes"
            placeholder="e.g. PT-1042 recovering well. Needs a follow-up appointment in two weeks and a reminder to bring previous reports. Family asked for a billing breakdown."
            helpText="Use fictional details only."
            submitLabel={DEMO_MODE ? "Generate tasks" : "Generate tasks with AI"}
            onSubmitNote={DEMO_MODE ? undefined : generateTasks}
            successMessage="AI task drafts ready. Review each task below before approving the plan."
          />
        </Panel>

        <Panel title="Review rules">
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

      {DEMO_MODE ? (
        <Panel title="Example plan: PT-1042 follow-up" action={<DemoDataBadge />}>
          <p className="mb-4 text-xs text-slate-500">
            Try it: tick, edit, cancel, add, or remove tasks. Changes in demo mode are not saved.
          </p>
          <TaskChecklist initialTasks={demoCarePlanTasks} />
        </Panel>
      ) : (
        <Panel title="Care plans">
          <CarePlanList />
        </Panel>
      )}
    </div>
  )
}