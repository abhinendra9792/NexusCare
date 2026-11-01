import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { api } from "@/lib/api"
import { DEMO_MODE, demoActivity, demoAppointments, demoStats } from "@/lib/demoData"
import { toAppointmentRequest } from "@/lib/mappers"
import type { ActivityEntry, AppointmentRequest, DashboardStats } from "@/types"

export type DashboardData = {
  stats: DashboardStats
  recentAppointments: AppointmentRequest[]
  recentActivity: ActivityEntry[]
}

type PreviewState = "loading" | "empty" | "error" | null

const emptyData: DashboardData = {
  stats: {
    totalAppointmentRequests: 0,
    awaitingReview: 0,
    documentsProcessed: 0,
    pendingTasks: 0,
    statusBreakdown: [],
  },
  recentAppointments: [],
  recentActivity: [],
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchLiveDashboard(): Promise<DashboardData> {
  const [stats, appointments, activity] = await Promise.all([
    api.getDashboardStats(),
    api.listAppointments(6),
    api.listActivity(6),
  ])
  return {
    stats,
    recentAppointments: appointments.map(toAppointmentRequest),
    recentActivity: activity,
  }
}

async function fetchDemoDashboard(preview: PreviewState): Promise<DashboardData> {
  if (preview === "loading") return new Promise<DashboardData>(() => {})
  await wait(600)
  if (preview === "error") throw new Error("Simulated error for testing the error state.")
  if (preview === "empty") return emptyData
  return { stats: demoStats, recentAppointments: demoAppointments, recentActivity: demoActivity }
}

export function useDashboardData() {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get("preview")
  const preview: PreviewState =
    DEMO_MODE && (raw === "loading" || raw === "empty" || raw === "error") ? raw : null

  return useQuery({
    queryKey: ["dashboard", preview],
    queryFn: () => (DEMO_MODE ? fetchDemoDashboard(preview) : fetchLiveDashboard()),
    retry: false,
  })
}
