import { Construction } from "lucide-react"

type PagePlaceholderProps = {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Construction className="mx-auto h-10 w-10 text-teal-600" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
        Built in Phase 3
      </p>
    </section>
  )
}