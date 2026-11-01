import { Mic, Type } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { AppointmentRequest, RequestType } from "@/types"

const requestTypeLabels: Record<RequestType, string> = {
  new: "New",
  follow_up: "Follow-up",
  reschedule: "Reschedule",
  cancellation: "Cancellation",
  other: "Other",
}

function formatRequested(date: string | null, time: string | null): string {
  if (!date) return "Not specified"
  const formatted = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
  return time ? `${formatted}, ${time}` : formatted
}

type RecentAppointmentsTableProps = {
  appointments: AppointmentRequest[]
}

export function RecentAppointmentsTable({ appointments }: RecentAppointmentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient ref.</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="hidden md:table-cell">Type</TableHead>
          <TableHead className="hidden sm:table-cell">Requested for</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appointment) => (
          <TableRow key={appointment.id}>
            <TableCell className="font-medium">
              <span className="flex items-center gap-2">
                {appointment.sourceType === "voice" ? (
                  <Mic className="h-3.5 w-3.5 text-slate-400" aria-label="Voice note" />
                ) : (
                  <Type className="h-3.5 w-3.5 text-slate-400" aria-label="Text note" />
                )}
                {appointment.patientReference ?? (
                  <span className="italic text-slate-400">Not provided</span>
                )}
              </span>
            </TableCell>
            <TableCell className="max-w-[220px] truncate">
              {appointment.reason ?? <span className="italic text-slate-400">Not provided</span>}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {requestTypeLabels[appointment.requestType]}
            </TableCell>
            <TableCell className="hidden text-slate-600 sm:table-cell">
              {formatRequested(appointment.requestedDate, appointment.requestedTime)}
            </TableCell>
            <TableCell>
              <StatusBadge status={appointment.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}