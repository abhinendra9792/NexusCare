import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PanelProps = {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}