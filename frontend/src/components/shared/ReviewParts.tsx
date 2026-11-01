type ReviewCardHeaderProps = { title: string; meta: string }

export function ReviewCardHeader({ title, meta }: ReviewCardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <span className="text-xs text-slate-500">{meta}</span>
    </div>
  )
}

type SourceTextBoxProps = { label?: string; text: string }

export function SourceTextBox({ label = "Original note", text }: SourceTextBoxProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{text}</p>
    </div>
  )
}