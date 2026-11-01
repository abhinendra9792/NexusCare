import { AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Panel } from "@/components/shared/Panel"
import { MAX_UPLOAD_MB } from "@/features/documents/PdfUploader"
import { DEMO_MODE } from "@/lib/demoData"

const apiUrl = import.meta.env.VITE_API_URL as string | undefined

const settings = [
  { label: "Data mode", value: DEMO_MODE ? "Demo data (fictional)" : "Live backend" },
  { label: "Backend API URL", value: apiUrl ?? "Not configured yet (Phase 5)" },
  { label: "AI provider", value: "Google Gemini, configured on the backend only" },  { label: "Maximum upload size", value: `${MAX_UPLOAD_MB} MB` },
  { label: "Build mode", value: import.meta.env.MODE },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Current configuration of this NexusCare instance." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Configuration" className="lg:col-span-2">
          <dl className="divide-y divide-slate-100">
            {settings.map((setting) => (
              <div key={setting.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="text-sm text-slate-500">{setting.label}</dt>
                <dd className="text-sm font-medium text-slate-900 sm:text-right">{setting.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            These values come from environment variables. To switch off demo data later, create{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">frontend/.env</code> containing{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">VITE_DEMO_MODE=false</code> and restart the app. API keys are
            never stored in the frontend.
          </p>
        </Panel>

        <Panel title="About this prototype">
          <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Academic project for a Generative AI course. Not for clinical use.</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>AI output can be wrong or incomplete.</li>
            <li>Every AI result must be reviewed and approved by a person.</li>
            <li>Use fictional data only.</li>
            <li>This app is not certified for healthcare compliance.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}