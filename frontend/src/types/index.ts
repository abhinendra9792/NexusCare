export type RecordStatus =
  | "draft"
  | "processing"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "failed"
  | "cancelled"

export type RequestType = "new" | "follow_up" | "reschedule" | "cancellation" | "other"

export type AppointmentRequest = {
  id: string
  createdAt: string
  sourceType: "text" | "voice"
  patientReference: string | null
  requestedDate: string | null
  requestedTime: string | null
  reason: string | null
  requestType: RequestType
  status: RecordStatus
}

export type ActivityEntry = {
  id: string
  createdAt: string
  entityType: string
  action: string
  summary: string
}

export type StatusCount = {
  status: RecordStatus
  count: number
}

export type DashboardStats = {
  totalAppointmentRequests: number
  awaitingReview: number
  documentsProcessed: number
  pendingTasks: number
  statusBreakdown: StatusCount[]
}
export type TaskPriority = "low" | "medium" | "high"

export type CarePlanTask = {
  id: string
  description: string
  sourceReason: string | null
  suggestedDueDate: string | null
  priority: TaskPriority | null
  taskStatus: "pending" | "completed" | "cancelled"
  reviewStatus: "draft" | "approved" | "rejected"
  origin: "ai" | "manual"
}