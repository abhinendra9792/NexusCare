import { useState, type FormEvent } from "react"
import { Ban, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CarePlanTask, TaskPriority } from "@/types"

const MIN_TASK_LENGTH = 3
const MAX_TASK_LENGTH = 300

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
}

const reviewStyles: Record<CarePlanTask["reviewStatus"], { label: string; className: string }> = {
  draft: { label: "Needs review", className: "text-amber-700" },
  approved: { label: "Approved", className: "text-teal-700" },
  rejected: { label: "Rejected", className: "text-rose-700" },
}

function validateDescription(text: string): string | null {
  if (text.length < MIN_TASK_LENGTH) return `Task must be at least ${MIN_TASK_LENGTH} characters.`
  if (text.length > MAX_TASK_LENGTH) return `Task must be ${MAX_TASK_LENGTH} characters or fewer.`
  return null
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type TaskChecklistProps = {
  initialTasks: CarePlanTask[]
}

export function TaskChecklist({ initialTasks }: TaskChecklistProps) {
  const [tasks, setTasks] = useState<CarePlanTask[]>(initialTasks)
  const [newTask, setNewTask] = useState("")
  const [newTaskError, setNewTaskError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [editError, setEditError] = useState<string | null>(null)

  const activeTasks = tasks.filter((task) => task.taskStatus !== "cancelled")
  const completedCount = activeTasks.filter((task) => task.taskStatus === "completed").length
  const progress = activeTasks.length === 0 ? 0 : Math.round((completedCount / activeTasks.length) * 100)

  function updateTask(id: string, changes: Partial<CarePlanTask>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...changes } : task)))
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = newTask.trim()
    const error = validateDescription(text)
    if (error) {
      setNewTaskError(error)
      return
    }
    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: text,
        sourceReason: null,
        suggestedDueDate: null,
        priority: null,
        taskStatus: "pending",
        reviewStatus: "draft",
        origin: "manual",
      },
    ])
    setNewTask("")
    setNewTaskError(null)
  }

  function startEdit(task: CarePlanTask) {
    setEditingId(task.id)
    setEditText(task.description)
    setEditError(null)
  }

  function saveEdit(id: string) {
    const text = editText.trim()
    const error = validateDescription(text)
    if (error) {
      setEditError(error)
      return
    }
    updateTask(id, { description: text })
    setEditingId(null)
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {completedCount} of {activeTasks.length} active tasks completed
          </span>
          <span>{progress}%</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Care plan progress"
        >
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No tasks yet. Add one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const isCompleted = task.taskStatus === "completed"
            const isCancelled = task.taskStatus === "cancelled"
            const isEditing = editingId === task.id
            const review = reviewStyles[task.reviewStatus]

            return (
              <li
                key={task.id}
                className={cn(
                  "rounded-lg border border-slate-200 p-3 transition-colors",
                  isCancelled ? "bg-slate-50" : "bg-white hover:border-slate-300",
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
                    checked={isCompleted}
                    disabled={isCancelled}
                    onChange={(event) =>
                      updateTask(task.id, { taskStatus: event.target.checked ? "completed" : "pending" })
                    }
                  />

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          <Input
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                            aria-label="Edit task description"
                            className="h-8 min-w-[200px] flex-1"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => saveEdit(task.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                        {editError && (
                          <p role="alert" className="text-xs text-red-600">
                            {editError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <label
                        htmlFor={`task-${task.id}`}
                        className={cn(
                          "cursor-pointer text-sm",
                          isCompleted || isCancelled ? "text-slate-400 line-through" : "text-slate-900",
                        )}
                      >
                        {task.description}
                      </label>
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
                      {isCancelled && <span className="font-medium text-slate-500">Cancelled</span>}
                    </div>

                    {task.sourceReason && (
                      <p className="mt-1 text-xs text-slate-500">Source: {task.sourceReason}</p>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit task: ${task.description}`}
                        disabled={isCancelled}
                        onClick={() => startEdit(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={isCancelled ? `Restore task: ${task.description}` : `Cancel task: ${task.description}`}
                        onClick={() => updateTask(task.id, { taskStatus: isCancelled ? "pending" : "cancelled" })}
                      >
                        {isCancelled ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                      {task.reviewStatus === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Remove task: ${task.description}`}
                          onClick={() => removeTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} noValidate className="space-y-1.5 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={newTask}
            onChange={(event) => {
              setNewTask(event.target.value)
              setNewTaskError(null)
            }}
            placeholder="Add a task, e.g. Call patient to confirm the date"
            aria-label="New task description"
            aria-invalid={newTaskError ? true : undefined}
            className="min-w-[220px] flex-1"
          />
          <Button type="submit" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add task
          </Button>
        </div>
        {newTaskError && (
          <p role="alert" className="text-xs text-red-600">
            {newTaskError}
          </p>
        )}
      </form>
    </div>
  )
}