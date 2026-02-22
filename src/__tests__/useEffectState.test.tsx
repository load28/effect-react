import { describe, it, expect } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useEffectState } from "../hooks/useEffectState.js"

const TestLayer = Layer.empty

describe("useEffectState", () => {
  it("loads initial value from effect", async () => {
    function Test() {
      const [result] = useEffectState(Effect.succeed("initial"))
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
      const [result, setState] = useEffectState(Effect.succeed("hello"))
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
      const [result, setState] = useEffectState(Effect.succeed("hello"))
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

  it("handles initial effect failure", async () => {
    function Test() {
      const [result] = useEffectState(Effect.fail("init-error"))
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
