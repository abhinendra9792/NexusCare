import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { renderWithClient } from "@/test/renderWithClient"
import type { ApiAppointment, AppointmentDraft } from "@/types"
import { AppointmentReviewCard } from "./AppointmentReviewCard"

vi.mock("@/lib/api", () => ({
  api: {
    updateAppointment: vi.fn(),
    approveAppointment: vi.fn(),
    rejectAppointment: vi.fn(),
    retryAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
  },
}))

const draft: AppointmentDraft = {
  patient_reference: "Priya Sharma",
  requested_date: null,
  requested_time: null,
  date_original_text: "next Tuesday",
  date_is_ambiguous: true,
  reason: "Knee follow-up",
  request_type: "follow_up",
  contact_preference: "phone",
  additional_notes: null,
  missing_information: ["Exact appointment date"],
  uncertainty_notes: [],
}

function makeRecord(overrides: Partial<ApiAppointment> = {}): ApiAppointment {
  return {
    id: "appt-1",
    createdAt: "2026-11-01T09:00:00Z",
    updatedAt: "2026-11-01T09:00:00Z",
    sourceType: "text",
    sourceText: "Priya needs a knee follow-up next Tuesday morning. Please call me.",
    status: "awaiting_review",
    draftContent: draft,
    approvedContent: null,
    aiModel: "fake-model",
    errorMessage: null,
    approvedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.updateAppointment).mockResolvedValue(makeRecord())
  vi.mocked(api.approveAppointment).mockResolvedValue(makeRecord({ status: "approved" }))
  vi.mocked(api.retryAppointment).mockResolvedValue(makeRecord())
})

describe("AppointmentReviewCard", () => {
  it("warns about a vague date and shows the original wording", () => {
    renderWithClient(<AppointmentReviewCard record={makeRecord()} />)

    expect(screen.getByText(/vague date/i)).toHaveTextContent("next Tuesday")
  })

  it("hides the warning once staff enter a date", () => {
    renderWithClient(<AppointmentReviewCard record={makeRecord()} />)

    fireEvent.change(screen.getByLabelText("Requested date"), { target: { value: "2026-11-10" } })

    expect(screen.queryByText(/vague date/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save and approve/i })).toBeInTheDocument()
  })

  it("saves the edits first, then approves", async () => {
    const user = userEvent.setup()
    renderWithClient(<AppointmentReviewCard record={makeRecord()} />)

    fireEvent.change(screen.getByLabelText("Requested date"), { target: { value: "2026-11-10" } })
    await user.click(screen.getByRole("button", { name: /save and approve/i }))

    await waitFor(() => expect(api.approveAppointment).toHaveBeenCalledWith("appt-1"))
    const savedDraft = vi.mocked(api.updateAppointment).mock.calls[0][1]
    expect(savedDraft).toMatchObject({ requested_date: "2026-11-10", date_is_ambiguous: false })

    const saveOrder = vi.mocked(api.updateAppointment).mock.invocationCallOrder[0]
    const approveOrder = vi.mocked(api.approveAppointment).mock.invocationCallOrder[0]
    expect(saveOrder).toBeLessThan(approveOrder)
  })

  it("shows an API error instead of failing silently", async () => {
    const user = userEvent.setup()
    vi.mocked(api.approveAppointment).mockRejectedValue(new Error("Only drafts awaiting review can be approved."))
    renderWithClient(<AppointmentReviewCard record={makeRecord()} />)

    await user.click(screen.getByRole("button", { name: /^approve$/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Only drafts awaiting review can be approved.")
  })

  it("offers a retry for a failed AI request", async () => {
    const user = userEvent.setup()
    renderWithClient(
      <AppointmentReviewCard
        record={makeRecord({ status: "failed", draftContent: null, errorMessage: "The AI service is busy." })}
      />,
    )

    expect(screen.getByText(/AI processing failed/i)).toHaveTextContent("The AI service is busy.")
    await user.click(screen.getByRole("button", { name: /try again/i }))

    await waitFor(() => expect(api.retryAppointment).toHaveBeenCalledWith("appt-1"))
  })
})