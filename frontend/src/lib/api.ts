import type { ActivityEntry, ApiAppointment, CreateAppointmentInput, DashboardStats } from "@/types"

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "")
const DEFAULT_TIMEOUT_MS = 15000

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  timeoutMs?: number
}

async function send(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The server took too long to respond. Please try again.", 0, "TIMEOUT")
    }
    throw new ApiError("Cannot reach the NexusCare server. Check that the backend is running.", 0, "NETWORK_ERROR")
  } finally {
    clearTimeout(timer)
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("The backend URL is not configured. Set VITE_API_URL in frontend/.env.", 0, "NOT_CONFIGURED")
  }

  const hasBody = options.body !== undefined
  const response = await send(
    `${API_URL}${path}`,
    {
      method: options.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    },
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  if (!response.ok) {
    let code = "HTTP_ERROR"
    let message = `Request failed (${response.status}).`
    try {
      const data = await response.json()
      if (data?.error) {
        code = data.error.code ?? code
        message = data.error.message ?? message
      }
    } catch {
      // The response was not JSON; keep the generic message.
    }
    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  getDashboardStats: () => apiRequest<DashboardStats>("/api/v1/dashboard/stats"),
  listAppointments: (limit = 50) => apiRequest<ApiAppointment[]>(`/api/v1/appointments?limit=${limit}`),
  createAppointment: (input: CreateAppointmentInput) =>
    apiRequest<ApiAppointment>("/api/v1/appointments", { method: "POST", body: input }),
  cancelAppointment: (id: string) =>
    apiRequest<ApiAppointment>(`/api/v1/appointments/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  listActivity: (limit = 50) => apiRequest<ActivityEntry[]>(`/api/v1/activity?limit=${limit}`),
}
