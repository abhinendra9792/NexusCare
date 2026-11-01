import type { ActivityEntry, AppointmentRequest, DashboardStats } from "@/types"

/**
 * Demo mode shows fictional sample data until the backend is connected.
 * Set VITE_DEMO_MODE=false in frontend/.env to turn it off (Phase 5).
 * All names, IDs, and dates below are fictional.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false"

export const demoAppointments: AppointmentRequest[] = [
  {
    id: "demo-apt-001",
    createdAt: "2026-10-28T09:15:00",
    sourceType: "voice",
    patientReference: "PT-1042",
    requestedDate: "2026-11-03",
    requestedTime: "10:30",
    reason: "Follow-up after blood test",
    requestType: "follow_up",
    status: "awaiting_review",
  },
  {
    id: "demo-apt-002",
    createdAt: "2026-10-28T08:40:00",
    sourceType: "text",
    patientReference: "PT-1187",
    requestedDate: null,
    requestedTime: null,
    reason: "New patient registration visit",
    requestType: "new",
    status: "awaiting_review",
  },
  {
    id: "demo-apt-003",
    createdAt: "2026-10-27T16:05:00",
    sourceType: "text",
    patientReference: "PT-0931",
    requestedDate: "2026-10-30",
    requestedTime: "15:00",
    reason: "Reschedule physiotherapy session",
    requestType: "reschedule",
    status: "approved",
  },
  {
    id: "demo-apt-004",
    createdAt: "2026-10-27T11:20:00",
    sourceType: "voice",
    patientReference: null,
    requestedDate: "2026-11-05",
    requestedTime: null,
    reason: "General consultation",
    requestType: "new",
    status: "rejected",
  },
  {
    id: "demo-apt-005",
    createdAt: "2026-10-26T14:50:00",
    sourceType: "text",
    patientReference: "PT-1205",
    requestedDate: "2026-10-29",
    requestedTime: "09:00",
    reason: "Cancel dental check-up",
    requestType: "cancellation",
    status: "approved",
  },
  {
    id: "demo-apt-006",
    createdAt: "2026-10-26T10:10:00",
    sourceType: "text",
    patientReference: "PT-0874",
    requestedDate: null,
    requestedTime: null,
    reason: null,
    requestType: "other",
    status: "failed",
  },
]

export const demoActivity: ActivityEntry[] = [
  {
    id: "demo-act-001",
    createdAt: "2026-10-28T09:16:00",
    entityType: "appointment_request",
    action: "generated",
    summary: "AI draft created for appointment request",
  },
  {
    id: "demo-act-002",
    createdAt: "2026-10-28T08:55:00",
    entityType: "document_job",
    action: "processed",
    summary: "Referral letter processed (3 items extracted)",
  },
  {
    id: "demo-act-003",
    createdAt: "2026-10-27T16:20:00",
    entityType: "appointment_request",
    action: "approved",
    summary: "Appointment request approved by staff",
  },
  {
    id: "demo-act-004",
    createdAt: "2026-10-27T13:45:00",
    entityType: "care_plan",
    action: "approved",
    summary: "Care plan approved with 4 tasks",
  },
  {
    id: "demo-act-005",
    createdAt: "2026-10-27T11:30:00",
    entityType: "service_request",
    action: "routed",
    summary: "Service request routed to Billing",
  },
  {
    id: "demo-act-006",
    createdAt: "2026-10-26T10:12:00",
    entityType: "appointment_request",
    action: "failed",
    summary: "AI processing failed (provider timeout)",
  },
]

export const demoStats: DashboardStats = {
  totalAppointmentRequests: 24,
  awaitingReview: 5,
  documentsProcessed: 12,
  pendingTasks: 9,
  statusBreakdown: [
    { status: "approved", count: 13 },
    { status: "awaiting_review", count: 5 },
    { status: "rejected", count: 3 },
    { status: "cancelled", count: 2 },
    { status: "failed", count: 1 },
  ],
}