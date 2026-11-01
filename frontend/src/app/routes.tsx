import type { RouteObject } from "react-router"
import { AppLayout } from "@/components/layout/AppLayout"
import ActivityLogPage from "@/pages/ActivityLogPage"
import AppointmentsPage from "@/pages/AppointmentsPage"
import CarePlansPage from "@/pages/CarePlansPage"
import DashboardPage from "@/pages/DashboardPage"
import DocumentsPage from "@/pages/DocumentsPage"
import NotFoundPage from "@/pages/NotFoundPage"
import ServiceRequestsPage from "@/pages/ServiceRequestsPage"
import SettingsPage from "@/pages/SettingsPage"
import VisitSummariesPage from "@/pages/VisitSummariesPage"

/** All app routes. Shared by the real app and by the navigation tests. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "appointments", element: <AppointmentsPage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "visit-summaries", element: <VisitSummariesPage /> },
      { path: "care-plans", element: <CarePlansPage /> },
      { path: "service-requests", element: <ServiceRequestsPage /> },
      { path: "activity", element: <ActivityLogPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]