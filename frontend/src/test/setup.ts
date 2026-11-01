import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Remove rendered components after each test so tests stay independent.
afterEach(() => {
  cleanup()
})