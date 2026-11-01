import { useState } from "react"
import { AlertTriangle, Check, Loader2, RotateCcw, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAppointmentReview } from "@/hooks/useAppointments"
import type { ApiAppointment, AppointmentDraft, ContactPreference, RequestType } from "@/types"

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: "new", label: "New appointment" },
  { value: "follow_up", label: "Follow-up" },
  { value: "reschedule", label: "Reschedule" },
  { value: "cancellation", label: "Cancellation" },
  { value: "other", label: "Other" },
]

const CONTACT_OPTIONS: { value: ContactPreference | ""; label: string }[] = [
  { value: "", label: "Not stated" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "any", label: "Any" },
]

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"

type FormState = {
  patientReference: string
  requestedDate: string
  requestedTime: string
  reason: string
  requestType: RequestType
  contactPreference: ContactPreference | ""
  additionalNotes: string
  missing: string
  uncertainty: string
}

function toForm(draft: AppointmentDraft): FormState {
  return {
    patientReference: draft.patient_reference ?? "",
    requestedDate: draft.requested_date ?? "",
    requestedTime: draft.requested_time ?? "",
    reason: draft.reason ?? "",
    requestType: draft.request_type,
    contactPreference: draft.contact_preference ?? "",
    additionalNotes: draft.additional_notes ?? "",
    missing: draft.missing_information.join("\n"),
    uncertainty: draft.uncertainty_notes.join("\n"),
  }
}

const clean = (value: string) => value.trim() || null
const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

function toDraft(form: FormState, original: AppointmentDraft): AppointmentDraft {
  const requestedDate = form.requestedDate || null
  return {
    ...original,
    patient_reference: clean(form.patientReference),
    requested_date: requestedDate,
    requested_time: form.requestedTime || null,
    // A date entered by staff is a confirmed requested date, so it is no longer ambiguous.
    date_is_ambiguous: requestedDate ? false : original.date_is_ambiguous,
    reason: clean(form.reason),
    request_type: form.requestType,
    contact_preference: form.contactPreference || null,
    additional_notes: clean(form.additionalNotes),
    missing_information: lines(form.missing),
    uncertainty_notes: lines(form.uncertainty),
  }
}

type AppointmentReviewCardProps = { record: ApiAppointment }

export function AppointmentReviewCard({ record }: AppointmentReviewCardProps) {
  const review = useAppointmentReview()
  const draft = record.draftContent as AppointmentDraft | null
  const [form, setForm] = useState<FormState | null>(() => (draft ? toForm(draft) : null))
  const [error, setError] = useState<string | null>(null)
  const [confirmReject, setConfirmReject] = useState(false)

  const busy =
    review.save.isPending ||
    review.approve.isPending ||
    review.reject.isPending ||
    review.retry.isPending ||
    review.cancel.isPending
  const dirty = draft !== null && form !== null && JSON.stringify(form) !== JSON.stringify(toForm(draft))
  const fieldId = (name: string) => `${record.id}-${name}`

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">
        {draft?.patient_reference ?? "Unnamed request"}
      </h3>
      <span className="text-xs text-slate-500">
        {record.sourceType === "voice" ? "Voice note" : "Text note"} · {new Date(record.createdAt).toLocaleString()}
      </span>
    </div>
  )

  const sourceNote = (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Original note</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{record.sourceText}</p>
    </div>
  )

  const errorBox = error && (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {error}
    </p>
  )

  // ---------- Failed: show the error and offer retry or cancel ----------
  if (record.status === "failed" || !draft || !form) {
    return (
      <article className="space-y-3 rounded-xl border border-red-200 bg-white p-4">
        {header}
        {sourceNote}
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>AI processing failed. {record.errorMessage ?? "Please try again."}</p>
        </div>
        {errorBox}
        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
            disabled={busy}
            onClick={() => run(() => review.retry.mutateAsync(record.id))}
          >
            {review.retry.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            )}
            {review.retry.isPending ? "Running AI again..." : "Try again"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => run(() => review.cancel.mutateAsync(record.id))}>
            Cancel request
          </Button>
        </div>
      </article>
    )
  }

  // ---------- Awaiting review: editable draft ----------
  const approve = () =>
    run(async () => {
      if (dirty) await review.save.mutateAsync({ id: record.id, draft: toDraft(form, draft) })
      await review.approve.mutateAsync(record.id)
    })

  const reject = () => {
    if (!confirmReject) {
      setConfirmReject(true)
      return
    }
    void run(() => review.reject.mutateAsync(record.id))
  }

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      {header}
      {sourceNote}

      {draft.date_is_ambiguous && !form.requestedDate && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            The note gives a vague date{draft.date_original_text ? ` ("${draft.date_original_text}")` : ""}. Confirm
            the exact date with the patient, then enter it below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("patient")}>Patient reference</Label>
          <Input
            id={fieldId("patient")}
            value={form.patientReference}
            placeholder="Not provided"
            onChange={(event) => update("patientReference", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("type")}>Request type</Label>
          <select
            id={fieldId("type")}
            className={selectClass}
            value={form.requestType}
            onChange={(event) => update("requestType", event.target.value as RequestType)}
            disabled={busy}
          >
            {REQUEST_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("date")}>Requested date</Label>
          <Input
            id={fieldId("date")}
            type="date"
            value={form.requestedDate}
            onChange={(event) => update("requestedDate", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("time")}>Requested time</Label>
          <Input
            id={fieldId("time")}
            type="time"
            value={form.requestedTime}
            onChange={(event) => update("requestedTime", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={fieldId("reason")}>Reason</Label>
          <Input
            id={fieldId("reason")}
            value={form.reason}
            placeholder="Not provided"
            onChange={(event) => update("reason", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("contact")}>Contact preference</Label>
          <select
            id={fieldId("contact")}
            className={selectClass}
            value={form.contactPreference}
            onChange={(event) => update("contactPreference", event.target.value as ContactPreference | "")}
            disabled={busy}
          >
            {CONTACT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("notes")}>Additional notes</Label>
          <Input
            id={fieldId("notes")}
            value={form.additionalNotes}
            onChange={(event) => update("additionalNotes", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("missing")}>Missing information (one per line)</Label>
          <Textarea
            id={fieldId("missing")}
            rows={3}
            value={form.missing}
            onChange={(event) => update("missing", event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={fieldId("uncertainty")}>Uncertainty notes (one per line)</Label>
          <Textarea
            id={fieldId("uncertainty")}
            rows={3}
            value={form.uncertainty}
            onChange={(event) => update("uncertainty", event.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      {errorBox}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Approving records this request for the appointment desk. It does not book an appointment.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={!dirty || busy}
            onClick={() => run(() => review.save.mutateAsync({ id: record.id, draft: toDraft(form, draft) }))}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save changes
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={busy}
            onClick={reject}
            onBlur={() => setConfirmReject(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {confirmReject ? "Click again to reject" : "Reject"}
          </Button>
          <Button className="gap-2 bg-teal-600 text-white hover:bg-teal-700" disabled={busy} onClick={approve}>
            {review.approve.isPending || review.save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            {dirty ? "Save and approve" : "Approve"}
          </Button>
        </div>
      </div>
    </article>
  )
}