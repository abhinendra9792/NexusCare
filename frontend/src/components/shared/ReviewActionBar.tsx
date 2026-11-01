import { useState } from "react"
import { Check, Loader2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ReviewActionBarProps = {
  note: string
  dirty: boolean
  busy: boolean
  approving: boolean
  error?: string | null
  approveLabel?: string
  onSave: () => void
  onReject: () => void
  onApprove: () => void
}

export function ReviewActionBar({
  note,
  dirty,
  busy,
  approving,
  error,
  approveLabel = "Approve",
  onSave,
  onReject,
  onApprove,
}: ReviewActionBarProps) {
  const [confirmReject, setConfirmReject] = useState(false)

  function handleReject() {
    if (!confirmReject) {
      setConfirmReject(true)
      return
    }
    setConfirmReject(false)
    onReject()
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">{note}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" disabled={!dirty || busy} onClick={onSave}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save changes
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={busy}
            onClick={handleReject}
            onBlur={() => setConfirmReject(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {confirmReject ? "Click again to reject" : "Reject"}
          </Button>
          <Button className="gap-2 bg-teal-600 text-white hover:bg-teal-700" disabled={busy} onClick={onApprove}>
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            {dirty ? "Save and approve" : approveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}