/**
 * Smoke + integration tests — verifies the demo app renders and all hooks work correctly
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

    expect(screen.getByText("1. useService + useEffectCallback")).toBeTruthy()
    expect(screen.getByText("2. useRunEffect")).toBeTruthy()
    expect(screen.getByText("3. useEffectState")).toBeTruthy()
    expect(screen.getByText("4. useEffectStateAsync — Todo List")).toBeTruthy()
    expect(screen.getByText("5. useEffectStateAsync — Async + isPending")).toBeTruthy()
    expect(screen.getByText("6. Nested EffectProvider")).toBeTruthy()
  })

  it("Counter: useService resolves and useEffectCallback increment/decrement works", async () => {
    await act(async () => {
      render(<App />)
    })

    // Wait for counter to resolve and display a number
    await waitFor(() => {
      const el = screen.getByTestId("counter-value")
      expect(el).toBeTruthy()
      expect(Number(el.textContent)).not.toBeNaN()
    })

    const getCounterValue = () => Number(screen.getByTestId("counter-value").textContent)
    const before = getCounterValue()

    // Click increment
    const plusBtns = screen.getAllByText("+")
    await act(async () => {
      fireEvent.click(plusBtns[0])
    })

    await waitFor(() => {
      expect(getCounterValue()).toBeGreaterThan(before)
    })

    const afterInc = getCounterValue()

    // Click decrement
    const minusBtns = screen.getAllByText("−")
    await act(async () => {
      fireEvent.click(minusBtns[0])
    })

    await waitFor(() => {
      expect(getCounterValue()).toBeLessThan(afterInc)
    })
  })

  it("RunEffectDemo: useRunEffect auto-loads and re-runs on deps change", async () => {
    await act(async () => {
      render(<App />)
    })

    // Initially loading
    await waitFor(() => {
      expect(screen.getByText("Loading user...")).toBeTruthy()
    })

    // Wait for user to load (600ms delay)
    await waitFor(
      () => {
        expect(screen.getByText("Alice")).toBeTruthy()
        expect(screen.getByText("Engineer")).toBeTruthy()
      },
      { timeout: 2000 },
    )

    // Click User 2 — should show loading then Bob
    await act(async () => {
      fireEvent.click(screen.getByText("User 2"))
    })

    await waitFor(
      () => {
        expect(screen.getByText("Bob")).toBeTruthy()
        expect(screen.getByText("Designer")).toBeTruthy()
      },
      { timeout: 2000 },
    )
  })

  it("SyncCounter: useEffectState provides value immediately (no Loading)", async () => {
    await act(async () => {
      render(<App />)
    })

    // Sync counter should render immediately with 0 (no Loading state)
    await waitFor(() => {
      const section = screen.getByText("3. useEffectState").closest("section")!
      const span = section.querySelector("span")!
      expect(Number(span.textContent)).toBe(0)
    })
  })

  it("TodoApp: useEffectStateAsync loads todos and actions work", async () => {
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

  it("AsyncDemo: useEffectStateAsync loads and updates with plain values", async () => {
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

  it("NestedProvider: inherits parent CounterService + adds ThemeService", async () => {
    await act(async () => {
      render(<App />)
    })

    // Wait for the nested panel to load — themed label uses both services
    await waitFor(
      () => {
        const label = screen.getByTestId("themed-label")
        expect(label.textContent).toMatch(/\[light\] Count: \d+/)
      },
      { timeout: 2000 },
    )

    // Click "Show Details" to verify service info (useEffectState toggle)
    await act(async () => {
      fireEvent.click(screen.getByText("Show Details"))
    })

    await waitFor(() => {
      const details = screen.getByTestId("theme-details")
      expect(details.textContent).toContain("CounterService (from parent)")
      expect(details.textContent).toContain("ThemeService (from this provider)")
    })

    // Toggle to dark mode — swaps the nested provider's layer
    await act(async () => {
      fireEvent.click(screen.getByText("Dark Mode"))
    })

    // Theme should change to dark
    await waitFor(
      () => {
        const label = screen.getByTestId("themed-label")
        expect(label.textContent).toMatch(/\[dark\] Count: \d+/)
      },
      { timeout: 2000 },
    )
  })

  it("NestedProvider: parent and child scopes show different themes simultaneously", async () => {
    await act(async () => {
      render(<App />)
    })

    // Wait for both theme labels to load
    await waitFor(
      () => {
        expect(screen.getByTestId("parent-theme").textContent).toContain("light")
        expect(screen.getByTestId("nested-theme").textContent).toContain("light")
      },
      { timeout: 2000 },
    )

    // Both start as "light" — parent from AppLayer, nested from LightThemeLayer default

    // Toggle to dark mode — only the nested scope changes
    await act(async () => {
      fireEvent.click(screen.getByText("Dark Mode"))
    })

    await waitFor(
      () => {
        // Parent scope: still "light" (from AppLayer, unaffected)
        expect(screen.getByTestId("parent-theme").textContent).toContain("light")
        // Nested scope: now "dark" (overridden by DarkThemeLayer)
        expect(screen.getByTestId("nested-theme").textContent).toContain("dark")
      },
      { timeout: 2000 },
    )
  })
})
