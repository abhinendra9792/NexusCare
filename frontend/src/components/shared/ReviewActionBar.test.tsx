import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ReviewActionBar } from "./ReviewActionBar"

function setup(overrides: Partial<Parameters<typeof ReviewActionBar>[0]> = {}) {
  const props = {
    note: "Approving does not book anything.",
    dirty: false,
    busy: false,
    approving: false,
    onSave: vi.fn(),
    onReject: vi.fn(),
    onApprove: vi.fn(),
    ...overrides,
  }
  render(<ReviewActionBar {...props} />)
  return props
}

describe("ReviewActionBar", () => {
  it("disables Save when nothing has changed", () => {
    setup({ dirty: false })
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeEnabled()
  })

  it("offers 'Save and approve' when there are unsaved edits", () => {
    setup({ dirty: true })
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save and approve/i })).toBeInTheDocument()
  })

  it("asks for a second click before rejecting", async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole("button", { name: /^reject$/i }))
    expect(props.onReject).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: /click again to reject/i }))
    expect(props.onReject).toHaveBeenCalledTimes(1)
  })

  it("disables every action while busy", () => {
    setup({ busy: true, dirty: true })
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled()
    }
  })

  it("shows the error message as an alert", () => {
    setup({ error: "The AI service is busy." })
    expect(screen.getByRole("alert")).toHaveTextContent("The AI service is busy.")
  })
})