import { useState } from "react"
import { FileText, Lightbulb, Trash2 } from "lucide-react"
import { FailedReviewCard } from "@/components/shared/FailedReviewCard"
import { ReviewActionBar } from "@/components/shared/ReviewActionBar"
import { ReviewCardHeader, SourceTextBox } from "@/components/shared/ReviewParts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useActionRunner } from "@/hooks/useActionRunner"
import { useVisitSummaryReview } from "@/hooks/useRecords"
import type { ApiVisitSummary, VisitSummaryDraft } from "@/types"

type Fact = VisitSummaryDraft["reported_facts"][number]
type FollowUp = VisitSummaryDraft["follow_up_actions"][number]

type FormState = {
  visitPurpose: string
  keyPoints: string
  facts: Fact[]
  followUps: FollowUp[]
  missing: string
  verification: string
}

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

function toForm(draft: VisitSummaryDraft): FormState {
  return {
    visitPurpose: draft.visit_purpose ?? "",
    keyPoints: draft.key_points.join("\n"),
    facts: draft.reported_facts,
    followUps: draft.follow_up_actions,
    missing: draft.missing_information.join("\n"),
    verification: draft.items_requiring_verification.join("\n"),
  }
}

function toDraft(form: FormState, original: VisitSummaryDraft): VisitSummaryDraft {
  return {
    ...original,
    visit_purpose: form.visitPurpose.trim() || null,
    key_points: lines(form.keyPoints),
    reported_facts: form.facts,
    follow_up_actions: form.followUps
      .map((item) => ({ ...item, action: item.action.trim() }))
      .filter((item) => item.action),
    missing_information: lines(form.missing),
    items_requiring_verification: lines(form.verification),
  }
}

function NotesBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-200">
      <FileText className="h-3 w-3" aria-hidden="true" />
      From your notes
    </span>
  )
}

function SuggestionBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
      <Lightbulb className="h-3 w-3" aria-hidden="true" />
      AI suggestion
    </span>
  )
}

type VisitSummaryReviewCardProps = { record: ApiVisitSummary }

export function VisitSummaryReviewCard({ record }: VisitSummaryReviewCardProps) {
  const review = useVisitSummaryReview()
  const { error, run } = useActionRunner()
  const draft = record.draftContent as VisitSummaryDraft | null
  const [form, setForm] = useState<FormState | null>(() => (draft ? toForm(draft) : null))

  const busy = [review.save, review.approve, review.reject, review.retry, review.cancel].some((m) => m.isPending)
  const meta = new Date(record.createdAt).toLocaleString()

  if (record.status === "failed" || !draft || !form) {
    return (
      <FailedReviewCard
        title="Visit summary"
        meta={meta}
        sourceText={record.sourceText}
        errorMessage={record.errorMessage}
        busy={busy}
        retrying={review.retry.isPending}
        actionError={error}
        onRetry={() => void run(() => review.retry.mutateAsync(record.id))}
        onCancel={() => void run(() => review.cancel.mutateAsync(record.id))}
      />
    )
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(draft))
  const fieldId = (name: string) => `${record.id}-${name}`

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const save = () => review.save.mutateAsync({ id: record.id, draft: toDraft(form, draft) })

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <ReviewCardHeader title="Visit summary" meta={meta} />
      <SourceTextBox label="Original visit notes" text={record.sourceText} />

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("purpose")}>Visit purpose</Label>
        <Input
          id={fieldId("purpose")}
          value={form.visitPurpose}
          placeholder="Not stated in the notes"
          onChange={(event) => update("visitPurpose", event.target.value)}
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("points")}>Key points (one per line)</Label>
        <Textarea
          id={fieldId("points")}
          rows={3}
          value={form.keyPoints}
          onChange={(event) => update("keyPoints", event.target.value)}
          disabled={busy}
        />
      </div>

      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-900">Facts reported in the notes</h4>
        {form.facts.length === 0 ? (
          <p className="text-sm text-slate-500">No facts listed.</p>
        ) : (
          <ul className="space-y-2">
            {form.facts.map((fact, index) => (
              <li key={index} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2">
                <NotesBadge />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{fact.fact}</p>
                  {fact.source_excerpt && (
                    <p className="mt-0.5 text-xs italic text-slate-500">&ldquo;{fact.source_excerpt}&rdquo;</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Remove fact ${index + 1}`}
                  onClick={() => update("facts", form.facts.filter((_, i) => i !== index))}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-900">Follow-up actions</h4>
        {form.followUps.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-up actions.</p>
        ) : (
          <ul className="space-y-2">
            {form.followUps.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {item.origin === "mentioned" ? <NotesBadge /> : <SuggestionBadge />}
                <Input
                  aria-label={`Follow-up action ${index + 1}`}
                  value={item.action}
                  onChange={(event) =>
                    update(
                      "followUps",
                      form.followUps.map((current, i) =>
                        i === index ? { ...current, action: event.target.value } : current,
                      ),
                    )
                  }
                  disabled={busy}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Remove follow-up action ${index + 1}`}
                  onClick={() => update("followUps", form.followUps.filter((_, i) => i !== index))}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Label htmlFor={fieldId("verify")}>Items needing staff verification (one per line)</Label>
          <Textarea
            id={fieldId("verify")}
            rows={3}
            value={form.verification}
            onChange={(event) => update("verification", event.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <ReviewActionBar
        note="Approving saves this summary as reviewed. It is an administrative record, not a clinical document."
        dirty={dirty}
        busy={busy}
        approving={review.approve.isPending || review.save.isPending}
        error={error}
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