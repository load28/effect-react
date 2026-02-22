import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useRunEffect } from "../hooks/useRunEffect.js"

const TestLayer = Layer.empty

function wrapper({ children }: { children: React.ReactNode }) {
  return <EffectProvider layer={TestLayer}>{children}</EffectProvider>
}

describe("useRunEffect", () => {
  it("starts in Loading state", () => {
    function Test() {
      const result = useRunEffect(Effect.succeed(42))
      return <div data-testid="tag">{result._tag}</div>
    }

    render(<Test />, { wrapper })
    expect(screen.getByTestId("tag").textContent).toBe("Loading")
  })

  it("resolves to Success with the value", async () => {
    function Test() {
      const result = useRunEffect(Effect.succeed(42))
      return (
        <div data-testid="result">
          {result._tag === "Success" ? String(result.value) : result._tag}
        </div>
      )
    }

    render(<Test />, { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("42")
  })

  it("resolves to Failure on error", async () => {
    function Test() {
      const result = useRunEffect(Effect.fail("boom"))
      return (
        <div data-testid="result">
          {result._tag === "Failure" ? String(result.error) : result._tag}
        </div>
      )
    }

    render(<Test />, { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("boom")
  })

  it("re-runs when deps change", async () => {
    function Test({ value }: { value: number }) {
      const result = useRunEffect(Effect.succeed(value * 2), {
        deps: [value],
      })
      return (
        <div data-testid="result">
          {result._tag === "Success" ? String(result.value) : result._tag}
        </div>
      )
    }

    const { rerender } = render(<Test value={5} />, { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("10")

    rerender(
      <EffectProvider layer={TestLayer}>
        <Test value={10} />
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("20")
  })

  it("handles async effects", async () => {
    const delayedEffect = Effect.delay(Effect.succeed("delayed"), "10 millis")

    function Test() {
      const result = useRunEffect(delayedEffect)
      return (
        <div data-testid="result">
          {result._tag === "Success" ? result.value : result._tag}
        </div>
      )
    }

    render(<Test />, { wrapper })

    expect(screen.getByTestId("result").textContent).toBe("Loading")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("delayed")
  })
})
