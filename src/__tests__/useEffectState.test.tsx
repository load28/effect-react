import { describe, it, expect } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useEffectState } from "../hooks/useEffectState.js"

const TestLayer = Layer.empty

describe("useEffectState (sync)", () => {
  it("returns initial value immediately — no Loading state", () => {
    function Test() {
      const [value] = useEffectState(Effect.succeed("hello"))
      return <div data-testid="result">{value}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    // Value is available on the first render — no Loading
    expect(screen.getByTestId("result").textContent).toBe("hello")
  })

  it("updates state with a plain value", () => {
    function Test() {
      const [value, setState] = useEffectState(Effect.succeed("hello"))
      return (
        <div>
          <div data-testid="result">{value}</div>
          <button data-testid="btn" onClick={() => setState("world")}>
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

    expect(screen.getByTestId("result").textContent).toBe("hello")

    fireEvent.click(screen.getByTestId("btn"))

    expect(screen.getByTestId("result").textContent).toBe("world")
  })

  it("updates state with a sync Effect", () => {
    function Test() {
      const [value, setState] = useEffectState(Effect.succeed(0))
      return (
        <div>
          <div data-testid="result">{value}</div>
          <button
            data-testid="btn"
            onClick={() => setState(Effect.succeed(value + 1))}
          >
            Increment
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("0")

    fireEvent.click(screen.getByTestId("btn"))

    expect(screen.getByTestId("result").textContent).toBe("1")
  })
})
