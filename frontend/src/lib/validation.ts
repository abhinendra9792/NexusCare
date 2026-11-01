import { z } from "zod"

export const MAX_NOTE_LENGTH = 5000

export function createNoteSchema(minLength: number) {
  return z.object({
    note: z
      .string()
      .trim()
      .min(minLength, `Please enter at least ${minLength} characters.`)
      .max(MAX_NOTE_LENGTH, `Please keep this under ${MAX_NOTE_LENGTH.toLocaleString()} characters.`),
  })
}

export type NoteFormValues = z.infer<ReturnType<typeof createNoteSchema>>