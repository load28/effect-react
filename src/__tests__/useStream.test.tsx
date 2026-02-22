import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer, Stream } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useStream } from "../hooks/useStream.js"

const TestLayer = Layer.empty

function wrapper({ children }: { children: React.ReactNode }) {
  return <EffectProvider layer={TestLayer}>{children}</EffectProvider>
}

describe("useStream", () => {
  it("starts in Loading state", () => {
    function Test() {
      const result = useStream(Stream.never)
      return <div data-testid="tag">{result._tag}</div>
    }

    render(<Test />, { wrapper })
    expect(screen.getByTestId("tag").textContent).toBe("Loading")
  })

  it("resolves to Success with emitted value", async () => {
    function Test() {
      const result = useStream(Stream.make(42))
      return (
        <div data-testid="result">
          {result._tag === "Success" ? String(result.value) : result._tag}
        </div>
      )
    }

    render(<Test />, { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("42")
  })

  it("updates with each new emission", async () => {
    // Create a stream that emits values over time
    const testStream = Stream.fromEffect(
      Effect.delay(Effect.succeed(1), "10 millis"),
    ).pipe(
      Stream.concat(
        Stream.fromEffect(Effect.delay(Effect.succeed(2), "50 millis")),
      ),
    )

    function Test() {
      const result = useStream(testStream)
      return (
        <div data-testid="result">
          {result._tag === "Success" ? String(result.value) : result._tag}
        </div>
      )
    }

    render(<Test />, { wrapper })

    expect(screen.getByTestId("result").textContent).toBe("Loading")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("1")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("2")
  })

  it("handles stream errors", async () => {
    function Test() {
      const result = useStream(Stream.fail("stream-error"))
      return (
        <div data-testid="result">
          {result._tag === "Failure" ? String(result.error) : result._tag}
        </div>
      )
    }

    render(<Test />, { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("stream-error")
  })
})
