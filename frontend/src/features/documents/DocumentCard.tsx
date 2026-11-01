import { useState } from "react"
import { AlertTriangle, CalendarClock, Check, ListTodo, Save, X } from "lucide-react"
import { formatDateTime } from "@/components/shared/RecordListPanel"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActionRunner } from "@/hooks/useActionRunner"
import { useDocumentItemActions } from "@/hooks/useRecords"
import type { ApiDocument, ApiExtractedItem } from "@/types"

type Field = { key: string; label: string; type?: "date" | "time"; wide?: boolean }

const FIELDS: Record<ApiExtractedItem["itemType"], Field[]> = {
  appointment: [
    { key: "date", label: "Date", type: "date" },
    { key: "time", label: "Time", type: "time" },
    { key: "department_or_provider", label: "Department or provider" },
    { key: "location", label: "Location" },
    { key: "purpose", label: "Purpose", wide: true },
  ],
  follow_up: [
    { key: "action", label: "Action", wide: true },
    { key: "due_date", label: "Due date", type: "date" },
  ],
}

const TYPE_INFO = {
  appointment: { label: "Appointment", icon: CalendarClock },
  follow_up: { label: "Follow-up action", icon: ListTodo },
}

type FormState = Record<string, string>

function toForm(content: Record<string, unknown>, fields: Field[]): FormState {
  return Object.fromEntries(
    fields.map((field) => [field.key, typeof content[field.key] === "string" ? (content[field.key] as string) : ""]),
  )
}

function DocumentItemRow({ item }: { item: ApiExtractedItem }) {
  const actions = useDocumentItemActions()
  const { error, run } = useActionRunner()
  const fields = FIELDS[item.itemType]
  const [form, setForm] = useState<FormState>(() => toForm(item.draftContent, fields))
  const [confirmReject, setConfirmReject] = useState(false)

  const reviewing = item.status === "awaiting_review"
  const busy = actions.save.isPending || actions.approve.isPending || actions.reject.isPending
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(item.draftContent, fields))
  const shown = item.approvedContent ?? item.draftContent
  const excerpt = typeof item.draftContent.source_excerpt === "string" ? item.draftContent.source_excerpt : null
  const { label, icon: Icon } = TYPE_INFO[item.itemType]

  const toDraft = () => ({
    ...item.draftContent,
    ...Object.fromEntries(fields.map((field) => [field.key, form[field.key].trim() || null])),
  })
  const save = () => actions.save.mutateAsync({ itemId: item.id, draft: toDraft() })

  function reject() {
    if (!confirmReject) {
      setConfirmReject(true)
      return
    }
    setConfirmReject(false)
    void run(() => actions.reject.mutateAsync(item.id))
  }

  return (
    <li className={reviewing ? "rounded-lg border border-amber-200 bg-amber-50/40 p-3" : "rounded-lg border border-slate-200 p-3"}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
          <Icon className="h-4 w-4 text-teal-600" aria-hidden="true" />
          {label}
        </span>
        <StatusBadge status={item.status} />
      </div>

      {reviewing ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className={field.wide ? "space-y-1 sm:col-span-2" : "space-y-1"}>
              <Label htmlFor={`${item.id}-${field.key}`} className="text-xs">
                {field.label}
              </Label>
              <Input
                id={`${item.id}-${field.key}`}
                type={field.type ?? "text"}
                value={form[field.key]}
                placeholder="Not stated in the document"
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                disabled={busy}
                className="h-8"
              />
            </div>
          ))}
        </div>
      ) : (
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className={field.wide ? "sm:col-span-2" : undefined}>
              <dt className="inline text-slate-500">{field.label}: </dt>
              <dd className="inline text-slate-900">
                {typeof shown[field.key] === "string" && shown[field.key] ? (shown[field.key] as string) : "Not stated"}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {excerpt && <p className="mt-2 text-xs italic text-slate-500">From the document: &ldquo;{excerpt}&rdquo;</p>}

      {error && (
        <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </p>
      )}

      {reviewing && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!dirty || busy}
            onClick={() => void run(save)}
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={busy}
            onClick={reject}
            onBlur={() => setConfirmReject(false)}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {confirmReject ? "Click again to reject" : "Reject"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 text-white hover:bg-teal-700"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (dirty) await save()
                await actions.approve.mutateAsync(item.id)
              })
            }
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {dirty ? "Save and approve" : "Approve"}
          </Button>
        </div>
      )}
    </li>
  )
}

type DocumentCardProps = { doc: ApiDocument }

export function DocumentCard({ doc }: DocumentCardProps) {
  const reviewedCount = doc.items.filter((item) => item.status !== "awaiting_review").length

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{doc.originalFilename}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {doc.pageCount ?? 0} page(s), {(doc.extractedCharCount ?? 0).toLocaleString()} characters,{" "}
            {formatDateTime(doc.createdAt)}
          </p>
        </div>
        <StatusBadge status={doc.status} className="shrink-0" />
      </div>

      {doc.status === "failed" && (
        <div role="alert" className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            AI processing failed. {doc.errorMessage ?? ""} The PDF itself was not stored, so upload it again to retry.
          </p>
        </div>
      )}

      {doc.textPreview && (
        <details className="rounded-lg bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">
            Extracted text preview
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{doc.textPreview}</p>
        </details>
      )}

      {doc.status === "draft" && (
        <p className="text-sm text-slate-500">This file was uploaded before AI extraction was enabled.</p>
      )}

      {doc.status !== "failed" && doc.status !== "draft" && (
        <>
          {doc.items.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments or follow-up actions were found in this document.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {reviewedCount} of {doc.items.length} item(s) reviewed. Approving records the details; it does not
                book anything.
              </p>
              <ul className="space-y-3">
                {doc.items.map((item) => (
                  <DocumentItemRow key={`${item.id}-${item.status}`} item={item} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </article>
  )
}