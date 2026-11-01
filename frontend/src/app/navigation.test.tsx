import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { routes } from "./routes"

// Every API function is a mock: lists return [], the dashboard returns empty stats.
const apiMock = vi.hoisted(() => {
  const fns = new Map<string, ReturnType<typeof vi.fn>>()
  const emptyStats = {
    totalAppointmentRequests: 0,
    awaitingReview: 0,
    documentsProcessed: 0,
    pendingTasks: 0,
    statusBreakdown: [],
  }
  return new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get(_target, prop) {
      if (typeof prop !== "string" || prop === "then") return undefined
      if (!fns.has(prop)) {
        fns.set(prop, vi.fn().mockResolvedValue(prop === "getDashboardStats" ? emptyStats : []))
      }
      return fns.get(prop)
    },
  })
})

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}))

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("navigation", () => {
  it("opens each workflow page from the sidebar", async () => {
    const user = userEvent.setup()
    renderAt("/")

    const pages = [
      { link: /^appointments$/i, heading: "Appointment requests" },
      { link: /^visit summaries$/i, heading: "Visit summaries" },
      { link: /^service requests$/i, heading: "Service request routing" },
      { link: /^care plans$/i, heading: "Care-plan checklists" },
      { link: /^document intelligence$/i, heading: "Document intelligence" },
    ]

    for (const page of pages) {
      await user.click(screen.getAllByRole("link", { name: page.link })[0])
      expect(await screen.findByRole("heading", { name: page.heading })).toBeInTheDocument()
    }
  })

  it("shows the not-found page for an unknown address", async () => {
    renderAt("/this-page-does-not-exist")

    expect(await screen.findByRole("heading", { level: 2, name: /page not found/i })).toBeInTheDocument()  })
})

describe("note form validation", () => {
  it("does not send a note that is too short", async () => {
    const user = userEvent.setup()
    renderAt("/appointments")

    await user.type(await screen.findByLabelText("Patient or caregiver note"), "Too short")
    await user.click(screen.getByRole("button", { name: /generate with ai/i }))

    expect(api.createAppointment).not.toHaveBeenCalled()
  })

  it("sends a valid note to the AI endpoint", async () => {
    const user = userEvent.setup()
    const note = "Fictional caregiver note: Rohan needs a dental check-up next week, please email me."
    renderAt("/appointments")

    await user.type(await screen.findByLabelText("Patient or caregiver note"), note)
    await user.click(screen.getByRole("button", { name: /generate with ai/i }))

    await waitFor(() =>
      expect(api.createAppointment).toHaveBeenCalledWith(expect.objectContaining({ sourceText: note })),
    )
  })
})