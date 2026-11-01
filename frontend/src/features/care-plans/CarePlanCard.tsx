import { useState, type FormEvent } from "react"
import { Ban, Check, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, X } from "lucide-react"
import { FailedReviewCard } from "@/components/shared/FailedReviewCard"
import { ReviewCardHeader, SourceTextBox } from "@/components/shared/ReviewParts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useActionRunner } from "@/hooks/useActionRunner"
import { useCarePlanActions } from "@/hooks/useRecords"
import { cn } from "@/lib/utils"
import type { ApiCarePlan, ApiCarePlanTask, TaskPriority } from "@/types"

const MIN_TASK_LENGTH = 3

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
}

const reviewLabels: Record<ApiCarePlanTask["reviewStatus"], { label: string; className: string }> = {
  draft: { label: "Needs review", className: "text-amber-700" },
  approved: { label: "Approved", className: "text-teal-700" },
  rejected: { label: "Rejected", className: "text-rose-700" },
}

const selectClass =
  "h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

type Actions = ReturnType<typeof useCarePlanActions>

type TaskRowProps = {
  task: ApiCarePlanTask
  reviewing: boolean
  active: boolean
  busy: boolean
  actions: Actions
  run: (action: () => Promise<unknown>) => Promise<void>
}

function TaskRow({ task, reviewing, active, busy, actions, run }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.description)
  const [due, setDue] = useState(task.suggestedDueDate ?? "")
  const [priority, setPriority] = useState<TaskPriority | "">(task.priority ?? "")

  const isDraft = task.reviewStatus === "draft"
  const isApproved = task.reviewStatus === "approved"
  const isRejected = task.reviewStatus === "rejected"
  const isCompleted = task.taskStatus === "completed"
  const isCancelled = task.taskStatus === "cancelled"
  const canReview = reviewing && isDraft
  const canTick = active && isApproved && !isCancelled
  const review = reviewLabels[task.reviewStatus]

  function saveEdit() {
    void run(async () => {
      await actions.updateTask.mutateAsync({
        taskId: task.id,
        changes: { description: text.trim(), suggestedDueDate: due || null, priority: priority || null },
      })
      setEditing(false)
    })
  }

  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        isDraft ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white",
        (isRejected || isCancelled) && "bg-slate-50",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={`task-${task.id}`}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
          checked={isCompleted}
          disabled={!canTick || busy}
          aria-label={isCompleted ? `Reopen task: ${task.description}` : `Mark task complete: ${task.description}`}
          onChange={(event) =>
            void run(() =>
              actions.updateTask.mutateAsync({
                taskId: task.id,
                changes: { taskStatus: event.target.checked ? "completed" : "pending" },
              }),
            )
          }
        />

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-label="Task description"
                className="h-8"
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={due}
                  onChange={(event) => setDue(event.target.value)}
                  aria-label="Suggested due date"
                  className="h-8 w-auto"
                />
                <select
                  className={selectClass}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority | "")}
                  aria-label="Priority"
                >
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <Button size="sm" disabled={busy || text.trim().length < MIN_TASK_LENGTH} onClick={saveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm",
                isCompleted || isCancelled || isRejected ? "text-slate-400 line-through" : "text-slate-900",
              )}
            >
              {task.description}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {task.priority && (
              <span className={cn("rounded-full px-2 py-0.5 font-medium", priorityStyles[task.priority])}>
                {task.priority} priority
              </span>
            )}
            {task.suggestedDueDate && (
              <span className="text-slate-500">Suggested by {formatDate(task.suggestedDueDate)}</span>
            )}
            <span className="text-slate-500">{task.origin === "ai" ? "AI suggested" : "Added manually"}</span>
            <span className={cn("font-medium", review.className)}>{review.label}</span>
            {isCompleted && <span className="font-medium text-teal-700">Completed</span>}
            {isCancelled && <span className="font-medium text-slate-500">Cancelled</span>}
          </div>

          {task.sourceReason && <p className="mt-1 text-xs text-slate-500">Source: {task.sourceReason}</p>}
        </div>

        {!editing && (
          <div className="flex shrink-0 gap-0.5">
            {canReview && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-teal-700 hover:bg-teal-50"
                  aria-label={`Approve task: ${task.description}`}
                  disabled={busy}
                  onClick={() => void run(() => actions.approveTask.mutateAsync(task.id))}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-700 hover:bg-rose-50"
                  aria-label={`Reject task: ${task.description}`}
                  disabled={busy}
                  onClick={() => void run(() => actions.rejectTask.mutateAsync(task.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Edit task: ${task.description}`}
                  disabled={busy}
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                  aria-label={`Delete task: ${task.description}`}
                  disabled={busy}
                  onClick={() => void run(() => actions.deleteTask.mutateAsync(task.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {active && isApproved && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={isCancelled ? `Restore task: ${task.description}` : `Cancel task: ${task.description}`}
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    actions.updateTask.mutateAsync({
                      taskId: task.id,
                      changes: { taskStatus: isCancelled ? "pending" : "cancelled" },
                    }),
                  )
                }
              >
                {isCancelled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

type CarePlanCardProps = { plan: ApiCarePlan }

export function CarePlanCard({ plan }: CarePlanCardProps) {
  const actions = useCarePlanActions()
  const { error, run } = useActionRunner()
  const [newTask, setNewTask] = useState("")
  const [confirmReject, setConfirmReject] = useState(false)

  const busy = Object.values(actions).some((mutation) => mutation.isPending)
  const title = plan.title ?? "Care plan"
  const meta = new Date(plan.createdAt).toLocaleString()

  if (plan.status === "failed") {
    return (
      <FailedReviewCard
        title={title}
        meta={meta}
        sourceText={plan.sourceText}
        errorMessage={plan.errorMessage}
        busy={busy}
        retrying={actions.retry.isPending}
        actionError={error}
        onRetry={() => void run(() => actions.retry.mutateAsync(plan.id))}
        onCancel={() => void run(() => actions.cancel.mutateAsync(plan.id))}
      />
    )
  }

  const reviewing = plan.status === "awaiting_review"
  const active = reviewing || plan.status === "approved"
  const draftCount = plan.tasks.filter((task) => task.reviewStatus === "draft").length
  const approvedCount = plan.tasks.filter((task) => task.reviewStatus === "approved").length
  const trackable = plan.tasks.filter((task) => task.reviewStatus === "approved" && task.taskStatus !== "cancelled")
  const completedCount = trackable.filter((task) => task.taskStatus === "completed").length
  const progress = trackable.length === 0 ? 0 : Math.round((completedCount / trackable.length) * 100)
  const canApprove = reviewing && draftCount === 0 && approvedCount > 0

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const description = newTask.trim()
    if (description.length < MIN_TASK_LENGTH) return
    void run(async () => {
      await actions.addTask.mutateAsync({ planId: plan.id, description })
      setNewTask("")
    })
  }

  function rejectPlan() {
    if (!confirmReject) {
      setConfirmReject(true)
      return
    }
    setConfirmReject(false)
    void run(() => actions.rejectPlan.mutateAsync(plan.id))
  }

  return (
    <article
      className={cn(
        "space-y-4 rounded-xl border bg-white p-4",
        reviewing ? "border-amber-200" : "border-slate-200",
      )}
    >
      <ReviewCardHeader title={title} meta={meta} />
      <SourceTextBox label="Progress notes" text={plan.sourceText} />

      {approvedCount > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {completedCount} of {trackable.length} approved tasks completed
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title} progress`}
          >
            <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {plan.tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          The AI found no administrative tasks in these notes. Add one below if needed.
        </p>
      ) : (
        <ul className="space-y-2">
          {plan.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              reviewing={reviewing}
              active={active}
              busy={busy}
              actions={actions}
              run={run}
            />
          ))}
        </ul>
      )}

      {reviewing && (
        <form onSubmit={addTask} noValidate className="flex flex-wrap gap-2">
          <Input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Add a task, e.g. Call patient to confirm the date"
            aria-label="New task description"
            className="min-w-[220px] flex-1"
            disabled={busy}
          />
          <Button
            type="submit"
            variant="outline"
            className="gap-2"
            disabled={busy || newTask.trim().length < MIN_TASK_LENGTH}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add task
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {reviewing && (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {draftCount > 0
              ? `${draftCount} task(s) still need review before the plan can be approved.`
              : approvedCount === 0
                ? "Approve at least one task before approving the plan."
                : "All tasks reviewed. Approving locks the task list; approved tasks can still be ticked off."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={busy}
              onClick={rejectPlan}
              onBlur={() => setConfirmReject(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {confirmReject ? "Click again to reject" : "Reject plan"}
            </Button>
            <Button
              className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
              disabled={busy || !canApprove}
              onClick={() => void run(() => actions.approvePlan.mutateAsync(plan.id))}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Approve plan
            </Button>
          </div>
        </div>
      )}

      {plan.status === "approved" && (
        <p className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-teal-700">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Approved{plan.approvedAt ? ` on ${new Date(plan.approvedAt).toLocaleDateString("en-IN")}` : ""}. The task list
          is locked; approved tasks can still be completed.
        </p>
      )}
    </article>
  )
}