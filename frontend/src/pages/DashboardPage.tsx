import { Link } from "react-router"
import { CalendarClock, ClipboardCheck, FileCheck2, ListTodo } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DemoDataBadge } from "@/components/shared/DemoDataBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { LoadingState } from "@/components/shared/LoadingState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { QuickActions } from "@/features/dashboard/QuickActions"
import { RecentActivity } from "@/features/dashboard/RecentActivity"
import { RecentAppointmentsTable } from "@/features/dashboard/RecentAppointmentsTable"
import { StatCard } from "@/features/dashboard/StatCard"
import { StatusChart } from "@/features/dashboard/StatusChart"
import { useDashboardData, type DashboardData } from "@/hooks/useDashboardData"

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <LoadingState rows={5} label="Loading dashboard…" />
    </div>
  )
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { stats, recentAppointments, recentActivity } = data
  const isEmpty = stats.totalAppointmentRequests === 0 && recentAppointments.length === 0

  if (isEmpty) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No requests yet"
        description="Create your first appointment request to see metrics and activity here."
        action={
          <Link
            to="/appointments"
            className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            New appointment request
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointment requests" value={stats.totalAppointmentRequests} icon={CalendarClock} hint="All time" accent="teal" />
        <StatCard label="Awaiting review" value={stats.awaitingReview} icon={ClipboardCheck} hint="Needs staff approval" accent="amber" />
        <StatCard label="Documents processed" value={stats.documentsProcessed} icon={FileCheck2} hint="PDFs extracted" accent="blue" />
        <StatCard label="Pending follow-up tasks" value={stats.pendingTasks} icon={ListTodo} hint="From approved care plans" accent="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Requests by status" className="lg:col-span-2">
          <StatusChart data={stats.statusBreakdown} />
        </Panel>
        <Panel title="Recent activity">
          <RecentActivity items={recentActivity} />
        </Panel>
      </div>

      <Panel
        title="Recent appointment requests"
        action={
          <Link to="/appointments" className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline">
            View all
          </Link>
        }
      >
        <RecentAppointmentsTable appointments={recentAppointments} />
      </Panel>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isPending, isError, error, refetch } = useDashboardData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care coordination overview"
        description="Requests, documents, and follow-up work at a glance."
        badge={<DemoDataBadge />}
      />

      <QuickActions />

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <DashboardContent data={data} />
      )}
    </div>
  )
}