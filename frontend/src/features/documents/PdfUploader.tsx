import { useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { AlertTriangle, CheckCircle2, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB ?? 5)

type SelectedFile = {
  file: File
  status: "checking" | "ready" | "invalid"
  error?: string
}

export type UploadResult = {
  pageCount: number | null
  extractedCharCount: number | null
}

type PdfUploaderProps = {
  onUpload?: (file: File) => Promise<UploadResult>
}

async function validatePdf(file: File): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith(".pdf")) return "Only PDF files are supported."
  if (file.type && file.type !== "application/pdf") return "This file does not look like a PDF."
  if (file.size === 0) return "This file is empty."
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `This file is larger than ${MAX_UPLOAD_MB} MB.`

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  const signature = String.fromCharCode(...header)
  if (!signature.startsWith("%PDF")) return "This file is not a valid PDF (the PDF header is missing)."

  return null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const statusStyles = {
  checking: { label: "Checking file...", className: "bg-blue-50 text-blue-700" },
  ready: { label: "Ready to process", className: "bg-teal-50 text-teal-700" },
  invalid: { label: "Cannot be processed", className: "bg-red-50 text-red-700" },
}

export function PdfUploader({ onUpload }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<SelectedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setSubmitted(false)
    setResult(null)
    setUploadError(null)
    setSelected({ file, status: "checking" })
    const error = await validatePdf(file)
    setSelected({ file, status: error ? "invalid" : "ready", error: error ?? undefined })
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0])
    event.target.value = ""
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  function clear() {
    setSelected(null)
    setSubmitted(false)
    setUploadError(null)
  }

  async function handleExtract() {
    if (!selected || selected.status !== "ready") return
    setUploadError(null)
    if (!onUpload) {
      setSubmitted(true)
      return
    }
    setIsUploading(true)
    try {
      const uploaded = await onUpload(selected.file)
      setResult(uploaded)
      setSelected(null)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging ? "border-teal-500 bg-teal-50" : "border-slate-300 bg-slate-50",
        )}
      >
        <UploadCloud className="h-10 w-10 text-teal-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-slate-900">Drag and drop a PDF here</p>
        <p className="mt-1 text-xs text-slate-500">PDF only, up to {MAX_UPLOAD_MB} MB, fictional documents only</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={onInputChange}
          aria-label="Choose a PDF file"
        />
      </div>

      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{selected.file.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">{formatSize(selected.file.size)}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                    statusStyles[selected.status].className,
                  )}
                  aria-live="polite"
                >
                  {selected.status === "checking" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                  {statusStyles[selected.status].label}
                </span>
              </div>
              {selected.error && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {selected.error}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Remove file"
              onClick={clear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {uploadError && (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{uploadError}</p>
        </div>
      )}

      {result && (
        <div role="status" className="flex gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Uploaded. {result.pageCount ?? 0} page(s) read and {(result.extractedCharCount ?? 0).toLocaleString()}{" "}
            characters of text extracted. The file itself was not stored. AI extraction of appointments and follow-ups
            arrives in Phase 6.
          </p>
        </div>
      )}

      {submitted && (
        <div role="status" className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>The file passed the browser checks. Demo mode is on, so nothing has been uploaded.</p>
        </div>
      )}

      <Button
        className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
        disabled={selected?.status !== "ready" || isUploading}
        onClick={handleExtract}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {isUploading ? "Uploading..." : "Upload and extract text"}
      </Button>
    </div>
  )
}