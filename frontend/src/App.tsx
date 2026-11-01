import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createBrowserRouter, RouterProvider } from "react-router"
import { AppLayout } from "@/components/layout/AppLayout"
import DashboardPage from "@/pages/DashboardPage"
import AppointmentsPage from "@/pages/AppointmentsPage"
import DocumentsPage from "@/pages/DocumentsPage"
import VisitSummariesPage from "@/pages/VisitSummariesPage"
import CarePlansPage from "@/pages/CarePlansPage"
import ServiceRequestsPage from "@/pages/ServiceRequestsPage"
import ActivityLogPage from "@/pages/ActivityLogPage"
import SettingsPage from "@/pages/SettingsPage"
import NotFoundPage from "@/pages/NotFoundPage"

const queryClient = new QueryClient()

const router = createBrowserRouter([
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
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}