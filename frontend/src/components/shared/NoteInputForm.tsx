import { useMemo, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, CheckCircle2, Mic, MicOff, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MAX_NOTE_LENGTH, createNoteSchema, type NoteFormValues } from "@/lib/validation"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"

export type NoteSourceType = "text" | "voice"

const DEFAULT_SUCCESS =
  "Demo mode: the input is valid, but nothing was sent or saved. Turn off demo mode to use the real AI."
type NoteInputFormProps = {
  id: string
  label: string
  placeholder: string
  helpText?: string
  submitLabel: string
  minLength?: number
  enableVoice?: boolean
  renderWarning?: (text: string) => ReactNode
  onSubmitNote?: (note: string, sourceType: NoteSourceType) => Promise<void>
  successMessage?: string
}

export function NoteInputForm({
  id,
  label,
  placeholder,
  helpText,
  submitLabel,
  minLength = 20,
  enableVoice = false,
  renderWarning,
  onSubmitNote,
  successMessage = DEFAULT_SUCCESS,
}: NoteInputFormProps) {
  const schema = useMemo(() => createNoteSchema(minLength), [minLength])
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [usedVoice, setUsedVoice] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { note: "" },
  })

  const note = watch("note") ?? ""

  const speech = useSpeechRecognition((text) => {
    const current = getValues("note")
    setValue("note", current ? `${current} ${text}` : text, { shouldValidate: true, shouldDirty: true })
    setUsedVoice(true)
    setSubmitted(false)
  })

  async function onValid(values: NoteFormValues) {
    setSubmitError(null)
    if (!onSubmitNote) {
      setSubmitted(true)
      return
    }
    try {
      await onSubmitNote(values.note, usedVoice ? "voice" : "text")
      reset()
      setUsedVoice(false)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  function clearForm() {
    reset()
    setSubmitted(false)
    setSubmitError(null)
    setUsedVoice(false)
  }

  const describedBy = [helpText ? `${id}-help` : null, errors.note ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ")

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          <span className={cn("text-xs", note.length > MAX_NOTE_LENGTH ? "text-red-600" : "text-slate-400")}>
            {note.length.toLocaleString()} / {MAX_NOTE_LENGTH.toLocaleString()}
          </span>
        </div>
        <Textarea
          id={id}
          rows={7}
          placeholder={placeholder}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...register("note", {
            onChange: () => {
              setSubmitted(false)
              setSubmitError(null)
            },
          })}
        />
        {helpText && (
          <p id={`${id}-help`} className="text-xs text-slate-500">
            {helpText}
          </p>
        )}
        {errors.note && (
          <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
            {errors.note.message}
          </p>
        )}
      </div>

      {renderWarning?.(note)}

      {enableVoice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          {speech.isSupported ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant={speech.isListening ? "destructive" : "outline"}
                className="gap-2"
                onClick={speech.isListening ? speech.stop : speech.start}
              >
                {speech.isListening ? (
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
                {speech.isListening ? "Stop recording" : "Record voice note"}
              </Button>
              <span className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
                {speech.isListening && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                )}
                {speech.isListening
                  ? "Listening... speak clearly, then press stop."
                  : "Your browser's speech service transcribes the audio and adds it to the note."}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Voice input isn't available in this browser. Please type the note instead.
            </p>
          )}
          {speech.error && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {speech.error}
            </p>
          )}
        </div>
      )}

      {submitError && (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{submitError}</p>
        </div>
      )}

      {submitted && (
        <div role="status" className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting} className="gap-2 bg-teal-600 text-white hover:bg-teal-700">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" disabled={note.length === 0 || isSubmitting} onClick={clearForm}>
          Clear
        </Button>
      </div>
    </form>
  )
}
