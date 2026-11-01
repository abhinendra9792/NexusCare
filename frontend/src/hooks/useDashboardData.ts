import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { DEMO_MODE, demoActivity, demoAppointments, demoStats } from "@/lib/demoData"
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

async function fetchDashboard(preview: PreviewState): Promise<DashboardData> {
  if (!DEMO_MODE) {
    throw new Error("The backend is not connected yet. It will be added in Phase 5.")
  }
  if (preview === "loading") {
    return new Promise<DashboardData>(() => {})
  }
  await wait(600)
  if (preview === "error") {
    throw new Error("Simulated error for testing the error state.")
  }
  if (preview === "empty") {
    return emptyData
  }
  return {
    stats: demoStats,
    recentAppointments: demoAppointments,
    recentActivity: demoActivity,
  }
}

export function useDashboardData() {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get("preview")
  const preview: PreviewState =
    DEMO_MODE && (raw === "loading" || raw === "empty" || raw === "error") ? raw : null

  return useQuery({
    queryKey: ["dashboard", preview],
    queryFn: () => fetchDashboard(preview),
    retry: false,
  })
}