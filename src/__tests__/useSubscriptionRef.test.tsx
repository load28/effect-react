import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer, SubscriptionRef } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useSubscriptionRef } from "../hooks/useSubscriptionRef.js"

const TestLayer = Layer.empty

function wrapper({ children }: { children: React.ReactNode }) {
  return <EffectProvider layer={TestLayer}>{children}</EffectProvider>
}

describe("useSubscriptionRef", () => {
  it("starts in Loading when ref is undefined", () => {
    function Test() {
      const result = useSubscriptionRef(undefined)
      return <div data-testid="tag">{result._tag}</div>
    }

    render(<Test />, { wrapper })
    expect(screen.getByTestId("tag").textContent).toBe("Loading")
  })

  it("resolves to Success with the current value", async () => {
    // We need to create a SubscriptionRef inside an Effect and store it externally
    let ref: SubscriptionRef.SubscriptionRef<number> | undefined

    function Test() {
      // Create the ref in a useEffect so it runs inside the runtime
      const [r, setR] = React.useState<SubscriptionRef.SubscriptionRef<number>>()

      React.useEffect(() => {
        Effect.runPromise(SubscriptionRef.make(42)).then(setR)
      }, [])

      const result = useSubscriptionRef(r)
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

  it("reactively updates when SubscriptionRef value changes", async () => {
    let ref: SubscriptionRef.SubscriptionRef<number> | undefined

    function Test() {
      const [r, setR] = React.useState<SubscriptionRef.SubscriptionRef<number>>()

      React.useEffect(() => {
        Effect.runPromise(SubscriptionRef.make(0)).then((created) => {
          ref = created
          setR(created)
        })
      }, [])

      const result = useSubscriptionRef(r)
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

    expect(screen.getByTestId("result").textContent).toBe("0")

    // Update the ref — should trigger re-render automatically
    await act(async () => {
      await Effect.runPromise(SubscriptionRef.set(ref!, 99))
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("99")
  })
})
