import { describe, it, expect } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useEffectStateAsync } from "../hooks/useEffectStateAsync.js"

const TestLayer = Layer.empty

describe("useEffectStateAsync", () => {
  it("loads initial value from effect", async () => {
    function Test() {
      const [result] = useEffectStateAsync(Effect.succeed("initial"))
      return (
        <div data-testid="result">
          {result._tag === "Success" ? result.value : result._tag}
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("Loading")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("initial")
  })

  it("updates state with a plain value", async () => {
    function Test() {
      const [result, setState] = useEffectStateAsync(Effect.succeed("hello"))
      return (
        <div>
          <div data-testid="result">
            {result._tag === "Success" ? result.value : result._tag}
          </div>
          <button
            data-testid="btn"
            onClick={() => setState("world")}
          >
            Update
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("hello")

    fireEvent.click(screen.getByTestId("btn"))

    expect(screen.getByTestId("result").textContent).toBe("world")
  })

  it("updates state with an effect", async () => {
    function Test() {
      const [result, setState] = useEffectStateAsync(Effect.succeed("hello"))
      return (
        <div>
          <div data-testid="result">
            {result._tag === "Success" ? result.value : result._tag}
          </div>
          <button
            data-testid="btn"
            onClick={() => setState(Effect.succeed("from-effect"))}
          >
            Update
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("hello")

    fireEvent.click(screen.getByTestId("btn"))

    // Synchronous effects resolve immediately, so we may skip Loading.
    // Wait for the state update to propagate.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("from-effect")
  })

  it("keeps old value visible while setter Effect runs (no Loading flash)", async () => {
    function Test() {
      const [result, setState] = useEffectStateAsync(Effect.succeed("initial"))
      return (
        <div>
          <div data-testid="result">
            {result._tag === "Success" ? result.value : result._tag}
          </div>
          <button
            data-testid="btn"
            onClick={() =>
              setState(Effect.delay(Effect.succeed("delayed-value"), "50 millis"))
            }
          >
            Update
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("initial")

    // Click to set a delayed Effect
    fireEvent.click(screen.getByTestId("btn"))

    // Old value should remain visible (no Loading flash)
    expect(screen.getByTestId("result").textContent).toBe("initial")

    // Wait for the effect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("delayed-value")
  })

  it("isPending is true during initial load and setter Effect", async () => {
    function Test() {
      const [result, setState, isPending] = useEffectStateAsync(Effect.succeed("initial"))
      return (
        <div>
          <div data-testid="result">
            {result._tag === "Success" ? result.value : result._tag}
          </div>
          <div data-testid="pending">{String(isPending)}</div>
          <button
            data-testid="btn"
            onClick={() =>
              setState(Effect.delay(Effect.succeed("delayed"), "50 millis"))
            }
          >
            Update
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    // isPending should be true during initial load
    expect(screen.getByTestId("pending").textContent).toBe("true")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // isPending should be false after initial load completes
    expect(screen.getByTestId("pending").textContent).toBe("false")

    fireEvent.click(screen.getByTestId("btn"))

    // isPending should be true while setter effect is running
    expect(screen.getByTestId("pending").textContent).toBe("true")
    // Old value should still be visible
    expect(screen.getByTestId("result").textContent).toBe("initial")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // isPending should be false after setter effect completes
    expect(screen.getByTestId("pending").textContent).toBe("false")
    expect(screen.getByTestId("result").textContent).toBe("delayed")
  })

  it("handles initial effect failure", async () => {
    function Test() {
      const [result] = useEffectStateAsync(Effect.fail("init-error"))
      return (
        <div data-testid="result">
          {result._tag === "Failure" ? String(result.error) : result._tag}
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("init-error")
  })
})
