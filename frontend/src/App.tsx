import { Button } from "@/components/ui/button"
import { HeartPulse } from "lucide-react"

export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="space-y-4 rounded-xl border bg-white p-8 text-center shadow-sm">
        <HeartPulse className="mx-auto h-10 w-10 text-teal-600" />
        <h1 className="text-2xl font-semibold text-slate-900">NexusCare</h1>
        <p className="text-slate-500">Tailwind + shadcn/ui are working.</p>
        <Button>Test button</Button>
      </div>
    </div>
  )
}