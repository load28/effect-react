/**
 * Smoke test — verifies the demo app renders and all hooks work correctly
 */
import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, act, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { App } from "./App"

describe("Demo App", () => {
  beforeEach(() => {
    cleanup()
  })

  it("renders the main page with all sections", async () => {
    await act(async () => {
      render(<App />)
    })

    await waitFor(() => {
      expect(screen.getByText("effect-react Demo")).toBeTruthy()
    })

    expect(screen.getByText(/Counter/)).toBeTruthy()
    expect(screen.getByText(/Todo List/)).toBeTruthy()
    expect(screen.getByText(/Async Demo/)).toBeTruthy()
  })

  it("Counter: useService resolves and useEffectCallback works", async () => {
    const { container } = await act(async () => render(<App />))

    // Wait for counter to render (service resolved)
    const getCounterValue = () => {
      const span = container.querySelector("section:first-of-type span")!
      return Number(span.textContent)
    }

    await waitFor(() => {
      expect(container.querySelector("section:first-of-type span")).toBeTruthy()
    })

    const before = getCounterValue()

    // Click increment — value should go up
    const plusBtn = screen.getByText("+")
    await act(async () => {
      fireEvent.click(plusBtn)
    })

    await waitFor(() => {
      expect(getCounterValue()).toBeGreaterThan(before)
    })

    const afterInc = getCounterValue()

    // Click decrement — value should go back down
    await act(async () => {
      fireEvent.click(screen.getByText("−"))
    })

    await waitFor(() => {
      expect(getCounterValue()).toBeLessThan(afterInc)
    })
  })

  it("TodoApp: useRunEffect loads todos and actions work", async () => {
    await act(async () => {
      render(<App />)
    })

    // Wait for todos to load
    await waitFor(() => {
      expect(screen.getByText("Learn Effect-TS")).toBeTruthy()
    })

    expect(screen.getByText("Build effect-react library")).toBeTruthy()
    expect(screen.getByText("Create a demo app")).toBeTruthy()

    // Add a new todo
    const input = screen.getByPlaceholderText("Add a todo...")
    await act(async () => {
      fireEvent.change(input, { target: { value: "Write tests" } })
      fireEvent.click(screen.getByText("Add"))
    })

    await waitFor(
      () => {
        expect(screen.getByText("Write tests")).toBeTruthy()
      },
      { timeout: 2000 },
    )
  })

  it("AsyncDemo: useEffectState loads and updates with plain values", async () => {
    await act(async () => {
      render(<App />)
    })

    // Wait for random number to load
    const getRandomContainer = () => screen.getByText("Random number:").parentElement!
    await waitFor(
      () => {
        expect(getRandomContainer().textContent).toMatch(/Random number:\s*\d+/)
      },
      { timeout: 2000 },
    )

    // Click "Set to 42" — instant state update
    await act(async () => {
      fireEvent.click(screen.getByText("Set to 42 (plain value)"))
    })

    await waitFor(() => {
      expect(getRandomContainer().textContent).toContain("42")
    })

    // Click "Reset to 0"
    await act(async () => {
      fireEvent.click(screen.getByText("Reset to 0"))
    })

    await waitFor(() => {
      expect(getRandomContainer().textContent).toContain("0")
    })
  })

  it("AsyncDemo: useEffectState re-fetches with Effect", async () => {
    await act(async () => {
      render(<App />)
    })

    const getRandomContainer = () => screen.getByText("Random number:").closest("div")!

    // Wait for initial load
    await waitFor(
      () => {
        const text = getRandomContainer().textContent || ""
        expect(text).toMatch(/Random number:\s*\d+/)
      },
      { timeout: 2000 },
    )

    // Click "Fetch New" — should re-fetch
    await act(async () => {
      fireEvent.click(screen.getByText("Fetch New (Effect)"))
    })

    // Eventually resolves back to a number
    await waitFor(
      () => {
        const text = getRandomContainer().textContent || ""
        expect(text).toMatch(/Random number:\s*\d+/)
      },
      { timeout: 3000 },
    )
  })
})
