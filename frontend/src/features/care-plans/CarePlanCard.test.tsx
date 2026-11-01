import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { renderWithClient } from "@/test/renderWithClient"
import type { ApiCarePlan, ApiCarePlanTask } from "@/types"
import { CarePlanCard } from "./CarePlanCard"

vi.mock("@/lib/api", () => ({
  api: {
    retryCarePlan: vi.fn(),
    cancelCarePlan: vi.fn(),
    approveCarePlan: vi.fn(),
    rejectCarePlan: vi.fn(),
    addCarePlanTask: vi.fn(),
    updateCarePlanTask: vi.fn(),
    deleteCarePlanTask: vi.fn(),
    approveCarePlanTask: vi.fn().mockResolvedValue({}),
    rejectCarePlanTask: vi.fn(),
  },
}))

function task(id: string, overrides: Partial<ApiCarePlanTask> = {}): ApiCarePlanTask {
  return {
    id,
    description: `Task ${id}`,
    sourceReason: "From the notes",
    suggestedDueDate: null,
    priority: null,
    taskStatus: "pending",
    reviewStatus: "draft",
    origin: "ai",
    sortOrder: 0,
    ...overrides,
  }
}

function makePlan(tasks: ApiCarePlanTask[], overrides: Partial<ApiCarePlan> = {}): ApiCarePlan {
  return {
    id: "plan-1",
    createdAt: "2026-11-01T09:00:00Z",
    updatedAt: "2026-11-01T09:00:00Z",
    sourceText: "Fictional progress notes used for testing.",
    status: "awaiting_review",
    aiModel: "fake-model",
    errorMessage: null,
    approvedAt: null,
    title: "Test plan",
    tasks,
    ...overrides,
  }
}

describe("CarePlanCard", () => {
  it("keeps 'Approve plan' disabled while tasks need review", () => {
    renderWithClient(<CarePlanCard plan={makePlan([task("1"), task("2")])} />)

    expect(screen.getByRole("button", { name: /approve plan/i })).toBeDisabled()
    expect(screen.getByText(/2 task\(s\) still need review/i)).toBeInTheDocument()
  })

  it("enables 'Approve plan' once every task is reviewed and one is approved", () => {
    const plan = makePlan([task("1", { reviewStatus: "approved" }), task("2", { reviewStatus: "rejected" })])
    renderWithClient(<CarePlanCard plan={plan} />)

    expect(screen.getByRole("button", { name: /approve plan/i })).toBeEnabled()
  })

  it("approves a single task through the API", async () => {
    const user = userEvent.setup()
    renderWithClient(<CarePlanCard plan={makePlan([task("1")])} />)

    await user.click(screen.getByRole("button", { name: "Approve task: Task 1" }))

    await waitFor(() => expect(api.approveCarePlanTask).toHaveBeenCalledWith("1"))
  })

  it("locks an approved plan but still allows ticking off approved tasks", () => {
    const plan = makePlan([task("1", { reviewStatus: "approved" })], {
      status: "approved",
      approvedAt: "2026-11-01T10:00:00Z",
    })
    renderWithClient(<CarePlanCard plan={plan} />)

    expect(screen.queryByLabelText("New task description")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /approve plan/i })).not.toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /mark task complete: task 1/i })).toBeEnabled()
    expect(screen.getByText(/task list is locked/i)).toBeInTheDocument()
  })
})