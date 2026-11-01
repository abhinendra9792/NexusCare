import type { ApiAppointment, AppointmentRequest, RequestType } from "@/types"

const REQUEST_TYPES: RequestType[] = ["new", "follow_up", "reschedule", "cancellation", "other"]

function readString(content: Record<string, unknown>, key: string): string | null {
  const value = content[key]
  return typeof value === "string" && value.trim() !== "" ? value : null
}

/** Approved content wins over the draft; drafts without AI content show as "Not provided". */
export function toAppointmentRequest(item: ApiAppointment): AppointmentRequest {
  const content = item.approvedContent ?? item.draftContent ?? {}
  const requestType = readString(content, "request_type")

  return {
    id: item.id,
    createdAt: item.createdAt,
    sourceType: item.sourceType,
    patientReference: readString(content, "patient_reference"),
    requestedDate: readString(content, "requested_date"),
    requestedTime: readString(content, "requested_time"),
    reason: readString(content, "reason"),
    requestType: REQUEST_TYPES.includes(requestType as RequestType) ? (requestType as RequestType) : "other",
    status: item.status,
  }
}
