import { Siren } from "lucide-react"

export function EmergencyBanner() {
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
      <Siren className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
      <div>
        <p className="font-semibold text-red-900">This may be a medical emergency.</p>
        <p className="mt-1 text-sm text-red-800">
          Don't wait for this form. Call your local emergency number now (India: 112). NexusCare
          only routes administrative requests and cannot help in an emergency.
        </p>
      </div>
    </div>
  )
}