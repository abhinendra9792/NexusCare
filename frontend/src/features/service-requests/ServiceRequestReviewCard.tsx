import { useState } from "react"
import { Info } from "lucide-react"
import { EmergencyBanner } from "@/components/shared/EmergencyBanner"
import { FailedReviewCard } from "@/components/shared/FailedReviewCard"
import { ReviewActionBar } from "@/components/shared/ReviewActionBar"
import { ReviewCardHeader, SourceTextBox } from "@/components/shared/ReviewParts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useActionRunner } from "@/hooks/useActionRunner"
import { useServiceRequestReview } from "@/hooks/useRecords"
import { cn } from "@/lib/utils"
import type { ApiServiceRequest, Confidence, ServiceCategory, ServiceClassificationDraft, Urgency } from "@/types"

export const CATEGORIES: { value: ServiceCategory; label: string; department: string }[] = [
  { value: "appointment_desk", label: "Appointment desk", department: "Appointment Desk" },
  { value: "billing", label: "Billing", department: "Billing" },
  { value: "medical_records", label: "Medical records", department: "Medical Records" },
  { value: "technical_support", label: "Technical support", department: "Technical Support" },
  { value: "general_support", label: "General support", department: "General Support" },
  { value: "other_needs_review", label: "Other / needs review", department: "Other / Needs Review" },
]

const URGENCIES: { value: Urgency; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
]

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-teal-50 text-teal-700 ring-teal-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-red-50 text-red-700 ring-red-200",
}

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"

const defaultDepartment = (category: ServiceCategory) =>
  CATEGORIES.find((option) => option.value === category)?.department ?? "Other / Needs Review"

type FormState = {
  summary: string
  category: ServiceCategory
  department: string
  urgency: Urgency
  urgencyReason: string
  missing: string
}

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

function toForm(draft: ServiceClassificationDraft): FormState {
  return {
    summary: draft.summary,
    category: draft.category,
    department: draft.suggested_department,
    urgency: draft.urgency,
    urgencyReason: draft.urgency_reason ?? "",
    missing: draft.missing_information.join("\n"),
  }
}

function toDraft(form: FormState, original: ServiceClassificationDraft): ServiceClassificationDraft {
  return {
    ...original,
    summary: form.summary.trim() || original.summary,
    category: form.category,
    suggested_department: form.department.trim() || defaultDepartment(form.category),
    urgency: form.urgency,
    urgency_reason: form.urgencyReason.trim() || null,
    missing_information: lines(form.missing),
    // possible_emergency is kept as the AI set it; the record-level flag can never be cleared anyway.
  }
}

type ServiceRequestReviewCardProps = { record: ApiServiceRequest }

export function ServiceRequestReviewCard({ record }: ServiceRequestReviewCardProps) {
  const review = useServiceRequestReview()
  const { error, run } = useActionRunner()
  const draft = record.draftContent as ServiceClassificationDraft | null
  const [form, setForm] = useState<FormState | null>(() => (draft ? toForm(draft) : null))

  const busy = [review.save, review.approve, review.reject, review.retry, review.cancel].some((m) => m.isPending)
  const meta = new Date(record.createdAt).toLocaleString()

  if (record.status === "failed" || !draft || !form) {
    return (
      <div className="space-y-3">
        {record.possibleEmergency && <EmergencyBanner />}
        <FailedReviewCard
          title="Service request"
          meta={meta}
          sourceText={record.sourceText}
          errorMessage={record.errorMessage}
          busy={busy}
          retrying={review.retry.isPending}
          actionError={error}
          onRetry={() => void run(() => review.retry.mutateAsync(record.id))}
          onCancel={() => void run(() => review.cancel.mutateAsync(record.id))}
        />
      </div>
    )
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(draft))
  const fieldId = (name: string) => `${record.id}-${name}`

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function changeCategory(category: ServiceCategory) {
    // Fill the department from the fixed list; staff can still type a different one.
    setForm((current) => (current ? { ...current, category, department: defaultDepartment(category) } : current))
  }

  const save = () => review.save.mutateAsync({ id: record.id, draft: toDraft(form, draft) })

  return (
    <article
      className={cn(
        "space-y-4 rounded-xl border bg-white p-4",
        record.possibleEmergency ? "border-red-300" : "border-slate-200",
      )}
    >
      {/* The emergency instruction always comes first, regardless of administrative urgency. */}
      {record.possibleEmergency && <EmergencyBanner />}

      <ReviewCardHeader title="Service request" meta={meta} />
      <SourceTextBox label="Original inquiry" text={record.sourceText} />

      <div className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <div className="space-y-1">
          <p>
            <span className="font-medium text-slate-900">Why the AI chose this: </span>
            {draft.explanation}
          </p>
          <p className="flex items-center gap-2 text-xs">
            AI confidence:
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium capitalize ring-1 ring-inset",
                confidenceStyles[draft.confidence],
              )}
            >
              {draft.confidence}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("summary")}>Summary</Label>
        <Input
          id={fieldId("summary")}
          value={form.summary}
          onChange={(event) => update("summary", event.target.value)}
          disabled={busy}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("category")}>Category</Label>
          <select
            id={fieldId("category")}
            className={selectClass}
            value={form.category}
            onChange={(event) => changeCategory(event.target.value as ServiceCategory)}
            disabled={busy}
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("department")}>Department</Label>
          <Input
            id={fieldId("department")}
            value={form.department}
            onChange={(event) => update("department", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("urgency")}>Administrative urgency</Label>
          <select
            id={fieldId("urgency")}
            className={selectClass}
            value={form.urgency}
            onChange={(event) => update("urgency", event.target.value as Urgency)}
            disabled={busy}
          >
            {URGENCIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("reason")}>Urgency reason</Label>
          <Input
            id={fieldId("reason")}
            value={form.urgencyReason}
            placeholder="No deadline or repeated contact mentioned"
            onChange={(event) => update("urgencyReason", event.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("missing")}>Missing information (one per line)</Label>
        <Textarea
          id={fieldId("missing")}
          rows={2}
          value={form.missing}
          onChange={(event) => update("missing", event.target.value)}
          disabled={busy}
        />
      </div>

      <ReviewActionBar
        note="Approving confirms the department for this inquiry. Urgency is administrative only, never medical."
        dirty={dirty}
        busy={busy}
        approving={review.approve.isPending || review.save.isPending}
        error={error}
        approveLabel="Approve routing"
        onSave={() => void run(save)}
        onReject={() => void run(() => review.reject.mutateAsync(record.id))}
        onApprove={() =>
          void run(async () => {
            if (dirty) await save()
            await review.approve.mutateAsync(record.id)
          })
        }
      />
    </article>
  )
}