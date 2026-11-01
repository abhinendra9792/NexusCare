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

export type ApiAppointment = {
  id: string
  createdAt: string
  updatedAt: string
  sourceType: "text" | "voice"
  sourceText: string
  status: RecordStatus
  draftContent: Record<string, unknown> | null
  approvedContent: Record<string, unknown> | null
  aiModel: string | null
  errorMessage: string | null
  approvedAt: string | null
}

export type CreateAppointmentInput = {
  sourceText: string
  sourceType: "text" | "voice"
}


export type ApiRecordBase = {
  id: string
  createdAt: string
  updatedAt: string
  sourceText: string
  status: RecordStatus
  aiModel: string | null
  errorMessage: string | null
  approvedAt: string | null
}

export type ApiVisitSummary = ApiRecordBase & {
  draftContent: Record<string, unknown> | null
  approvedContent: Record<string, unknown> | null
}

export type ServiceCategory =
  | "appointment_desk"
  | "billing"
  | "medical_records"
  | "technical_support"
  | "general_support"
  | "other_needs_review"

export type ApiServiceRequest = ApiRecordBase & {
  draftContent: Record<string, unknown> | null
  approvedContent: Record<string, unknown> | null
  category: ServiceCategory | null
  possibleEmergency: boolean
}

export type ApiCarePlanTask = {
  id: string
  description: string
  sourceReason: string | null
  suggestedDueDate: string | null
  priority: TaskPriority | null
  taskStatus: CarePlanTask["taskStatus"]
  reviewStatus: CarePlanTask["reviewStatus"]
  origin: CarePlanTask["origin"]
  sortOrder: number
}

export type ApiCarePlan = ApiRecordBase & {
  title: string | null
  tasks: ApiCarePlanTask[]
}

export type ApiExtractedItem = {
  id: string
  itemType: "appointment" | "follow_up"
  draftContent: Record<string, unknown>
  approvedContent: Record<string, unknown> | null
  status: RecordStatus
  approvedAt: string | null
}

export type ApiDocument = {
  id: string
  createdAt: string
  updatedAt: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number | null
  extractedCharCount: number | null
  textPreview: string | null
  status: RecordStatus
  aiModel: string | null
  errorMessage: string | null
  items: ApiExtractedItem[]
}

export type ContactPreference = "phone" | "email" | "sms" | "any"

/** The AI draft for an appointment request (keys match the backend schema). */
export type AppointmentDraft = {
  patient_reference: string | null
  requested_date: string | null
  requested_time: string | null
  date_original_text: string | null
  date_is_ambiguous: boolean
  reason: string | null
  request_type: RequestType
  contact_preference: ContactPreference | null
  additional_notes: string | null
  missing_information: string[]
  uncertainty_notes: string[]
}

export type FollowUpOrigin = "mentioned" | "suggested"

/** The AI draft for a visit summary (keys match the backend schema). */
export type VisitSummaryDraft = {
  visit_purpose: string | null
  key_points: string[]
  reported_facts: { fact: string; source_excerpt: string | null }[]
  follow_up_actions: { action: string; origin: FollowUpOrigin }[]
  missing_information: string[]
  items_requiring_verification: string[]
}

export type Urgency = "low" | "normal" | "high"
export type Confidence = "low" | "medium" | "high"

/** The AI draft for a service request classification (keys match the backend schema). */
export type ServiceClassificationDraft = {
  summary: string
  category: ServiceCategory
  suggested_department: string
  urgency: Urgency
  urgency_reason: string | null
  explanation: string
  missing_information: string[]
  confidence: Confidence
  possible_emergency: boolean
}

/** Fields that can be changed on a care-plan task. Send only what changes. */
export type CarePlanTaskChanges = {
  description?: string
  suggestedDueDate?: string | null
  priority?: TaskPriority | null
  taskStatus?: CarePlanTask["taskStatus"]
}