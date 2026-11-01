import { useCallback, useEffect, useRef, useState } from "react"

type SpeechResultLike = { 0: { transcript: string }; isFinal: boolean }
type SpeechEventLike = { resultIndex: number; results: ArrayLike<SpeechResultLike> }
type SpeechErrorLike = { error: string }

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechEventLike) => void) | null
  onerror: ((event: SpeechErrorLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const errorMessages: Record<string, string> = {
  "not-allowed": "Microphone permission was denied. Allow access in your browser settings, or type instead.",
  "no-speech": "No speech was detected. Please try again.",
  "audio-capture": "No microphone was found. Please type instead.",
  network: "Voice recognition needs an internet connection. Please type instead.",
}

export function useSpeechRecognition(onFinalText: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbackRef = useRef(onFinalText)

  useEffect(() => {
    callbackRef.current = onFinalText
  }, [onFinalText])

  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  const isSupported = getSpeechRecognition() !== null

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setError("Voice input isn't supported in this browser. Please type instead.")
      return
    }
    setError(null)

    const recognition = new Recognition()
    recognition.lang = "en-IN"
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          callbackRef.current(result[0].transcript.trim())
        }
      }
    }
    recognition.onerror = (event) => {
      setError(errorMessages[event.error] ?? "Voice input stopped unexpectedly. Please type instead.")
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setError("Voice input could not start. Please try again or type instead.")
    }
  }, [])

  return { isSupported, isListening, error, start, stop }
}