import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getStatusLabel } from "@/components/shared/StatusBadge"
import type { RecordStatus, StatusCount } from "@/types"

const barColors: Record<RecordStatus, string> = {
  approved: "#0d9488",
  awaiting_review: "#f59e0b",
  rejected: "#e11d48",
  cancelled: "#94a3b8",
  failed: "#dc2626",
  processing: "#3b82f6",
  draft: "#64748b",
}

type StatusChartProps = {
  data: StatusCount[]
}

export function StatusChart({ data }: StatusChartProps) {
  const chartData = data.map((item) => ({
    name: getStatusLabel(item.status),
    count: item.count,
    color: barColors[item.status],
  }))

  return (
    <div className="h-64 w-full" role="img" aria-label="Bar chart of appointment requests by status">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}