import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EmergencyBanner } from "@/components/shared/EmergencyBanner"
import { renderWithClient } from "@/test/renderWithClient"
import type { ApiServiceRequest, ServiceClassificationDraft } from "@/types"
import { ServiceRequestReviewCard } from "./ServiceRequestReviewCard"

vi.mock("@/lib/api", () => ({
  api: {
    updateServiceRequest: vi.fn(),
    approveServiceRequest: vi.fn(),
    rejectServiceRequest: vi.fn(),
    retryServiceRequest: vi.fn(),
    cancelServiceRequest: vi.fn(),
  },
}))

const draft: ServiceClassificationDraft = {
  summary: "Mixed request about a bill.",
  category: "other_needs_review",
  suggested_department: "General Support",
  urgency: "normal",
  urgency_reason: null,
  explanation: "The message mixes two topics.",
  missing_information: [],
  confidence: "low",
  possible_emergency: true,
}

function makeRecord(overrides: Partial<ApiServiceRequest> = {}): ApiServiceRequest {
  return {
    id: "sr-1",
    createdAt: "2026-11-01T09:00:00Z",
    updatedAt: "2026-11-01T09:00:00Z",
    sourceText: "Fictional inquiry used for testing.",
    status: "awaiting_review",
    aiModel: "fake-model",
    errorMessage: null,
    approvedAt: null,
    draftContent: draft,
    approvedContent: null,
    category: null,
    possibleEmergency: true,
    ...overrides,
  }
}

function emergencyBannerText(): string {
  const { container, unmount } = render(<EmergencyBanner />)
  const text = container.textContent ?? ""
  unmount()
  return text
}

describe("ServiceRequestReviewCard", () => {
  it("shows the emergency banner before anything else", () => {
    const bannerText = emergencyBannerText()
    renderWithClient(<ServiceRequestReviewCard record={makeRecord()} />)

    const card = screen.getByRole("article")
    expect(bannerText).not.toBe("")
    expect(card.firstElementChild?.textContent).toBe(bannerText)
  })

  it("does not show the banner for a normal request", () => {
    const bannerText = emergencyBannerText()
    renderWithClient(
      <ServiceRequestReviewCard
        record={makeRecord({ possibleEmergency: false, draftContent: { ...draft, possible_emergency: false } })}
      />,
    )

    expect(screen.getByRole("article").textContent).not.toContain(bannerText)
  })

  it("fills the department from the fixed list when staff change the category", async () => {
    const user = userEvent.setup()
    renderWithClient(<ServiceRequestReviewCard record={makeRecord()} />)

    await user.selectOptions(screen.getByLabelText("Category"), "billing")

    expect(screen.getByLabelText("Department")).toHaveValue("Billing")
    expect(screen.getByRole("button", { name: /save and approve/i })).toBeInTheDocument()
  })
})