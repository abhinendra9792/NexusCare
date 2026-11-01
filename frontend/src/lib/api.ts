import type {
  ActivityEntry,
  ApiAppointment,
  ApiCarePlan,
  ApiDocument,
  ApiServiceRequest,
  ApiVisitSummary,
  CreateAppointmentInput,
  DashboardStats,
} from "@/types"

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "")
const DEFAULT_TIMEOUT_MS = 15000
// AI calls can be slow: the backend waits up to 30s per attempt and retries up to 2 times.
const AI_TIMEOUT_MS = 120000

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
  const isFormData = options.body instanceof FormData
  let body: BodyInit | undefined
  if (hasBody) body = isFormData ? (options.body as FormData) : JSON.stringify(options.body)

  const response = await send(
    `${API_URL}${path}`,
    {
      method: options.method ?? "GET",
      // For file uploads the browser sets the multipart Content-Type itself.
      headers: hasBody && !isFormData ? { "Content-Type": "application/json" } : undefined,
      body,
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

const id = (value: string) => encodeURIComponent(value)

export const api = {
  getDashboardStats: () => apiRequest<DashboardStats>("/api/v1/dashboard/stats"),
  listActivity: (limit = 50) => apiRequest<ActivityEntry[]>(`/api/v1/activity?limit=${limit}`),

  // ---------- Appointments ----------
  listAppointments: (limit = 50) => apiRequest<ApiAppointment[]>(`/api/v1/appointments?limit=${limit}`),
  /** Saves the note and runs AI extraction. Returns a draft awaiting review. */
  createAppointment: (input: CreateAppointmentInput) =>
    apiRequest<ApiAppointment>("/api/v1/appointments/generate", {
      method: "POST",
      body: input,
      timeoutMs: AI_TIMEOUT_MS,
    }),
  retryAppointment: (recordId: string) =>
    apiRequest<ApiAppointment>(`/api/v1/appointments/${id(recordId)}/retry`, {
      method: "POST",
      timeoutMs: AI_TIMEOUT_MS,
    }),
      updateAppointment: (recordId: string, draftContent: Record<string, unknown>) =>
    apiRequest<ApiAppointment>(`/api/v1/appointments/${id(recordId)}`, { method: "PATCH", body: { draftContent } }),
  approveAppointment: (recordId: string) =>
    apiRequest<ApiAppointment>(`/api/v1/appointments/${id(recordId)}/approve`, { method: "POST" }),
  rejectAppointment: (recordId: string) =>
    apiRequest<ApiAppointment>(`/api/v1/appointments/${id(recordId)}/reject`, { method: "POST" }),
  cancelAppointment: (recordId: string) =>
    apiRequest<ApiAppointment>(`/api/v1/appointments/${id(recordId)}/cancel`, { method: "POST" }),

  // ---------- Visit summaries ----------
  listVisitSummaries: (limit = 50) => apiRequest<ApiVisitSummary[]>(`/api/v1/visit-summaries?limit=${limit}`),
  /** Saves the notes and runs AI summarisation. Returns a draft awaiting review. */
  createVisitSummary: (sourceText: string) =>
    apiRequest<ApiVisitSummary>("/api/v1/visit-summaries/generate", {
      method: "POST",
      body: { sourceText },
      timeoutMs: AI_TIMEOUT_MS,
    }),
  retryVisitSummary: (recordId: string) =>
    apiRequest<ApiVisitSummary>(`/api/v1/visit-summaries/${id(recordId)}/retry`, {
      method: "POST",
      timeoutMs: AI_TIMEOUT_MS,
    }),

  // ---------- Service requests ----------
  listServiceRequests: (limit = 50) => apiRequest<ApiServiceRequest[]>(`/api/v1/service-requests?limit=${limit}`),
  /** Runs the emergency keyword check, saves the inquiry, then runs AI classification. */
  createServiceRequest: (sourceText: string) =>
    apiRequest<ApiServiceRequest>("/api/v1/service-requests/generate", {
      method: "POST",
      body: { sourceText },
      timeoutMs: AI_TIMEOUT_MS,
    }),
  retryServiceRequest: (recordId: string) =>
    apiRequest<ApiServiceRequest>(`/api/v1/service-requests/${id(recordId)}/retry`, {
      method: "POST",
      timeoutMs: AI_TIMEOUT_MS,
    }),

  // ---------- Care plans ----------
  listCarePlans: (limit = 50) => apiRequest<ApiCarePlan[]>(`/api/v1/care-plans?limit=${limit}`),
  /** Saves the progress notes and runs AI task generation. Tasks start as drafts. */
  createCarePlan: (input: { sourceText: string; title?: string }) =>
    apiRequest<ApiCarePlan>("/api/v1/care-plans/generate", {
      method: "POST",
      body: input,
      timeoutMs: AI_TIMEOUT_MS,
    }),
  retryCarePlan: (recordId: string) =>
    apiRequest<ApiCarePlan>(`/api/v1/care-plans/${id(recordId)}/retry`, {
      method: "POST",
      timeoutMs: AI_TIMEOUT_MS,
    }),

  // ---------- Documents ----------
  listDocuments: (limit = 50) => apiRequest<ApiDocument[]>(`/api/v1/documents?limit=${limit}`),
  /** Uploads the PDF, extracts text, and runs AI extraction. A failed document must be uploaded again. */
  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append("file", file)
    return apiRequest<ApiDocument>("/api/v1/documents/generate", {
      method: "POST",
      body: form,
      timeoutMs: AI_TIMEOUT_MS,
    })
  },
}