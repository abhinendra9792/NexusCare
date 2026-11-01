import { useState } from "react"

/** Runs an async action and keeps a user-friendly error message if it fails. */
export function useActionRunner() {
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  return { error, run }
}