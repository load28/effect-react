import { describe, it, expect } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useEffectCallback } from "../hooks/useEffectCallback.js"

const TestLayer = Layer.empty

describe("useEffectCallback", () => {
  it("starts with Loading result and isLoading false", () => {
    function Test() {
      const { result, isLoading } = useEffectCallback(
        (n: number) => Effect.succeed(n * 2),
      )
      return (
        <div>
          <span data-testid="tag">{result._tag}</span>
          <span data-testid="loading">{String(isLoading)}</span>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    // Initial state shows Loading (from Initial -> Loading mapping)
    expect(screen.getByTestId("tag").textContent).toBe("Loading")
    expect(screen.getByTestId("loading").textContent).toBe("false")
  })

  it("runs the effect when invoked and shows result", async () => {
    function Test() {
      const { run, result, isLoading } = useEffectCallback(
        (n: number) => Effect.succeed(n * 2),
      )
      return (
        <div>
          <button data-testid="btn" onClick={() => run(5)}>
            Run
          </button>
          <span data-testid="result">
            {result._tag === "Success" ? String(result.value) : result._tag}
          </span>
          <span data-testid="loading">{String(isLoading)}</span>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    fireEvent.click(screen.getByTestId("btn"))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("10")
    expect(screen.getByTestId("loading").textContent).toBe("false")
  })

  it("handles failures", async () => {
    function Test() {
      const { run, result } = useEffectCallback(
        (msg: string) => Effect.fail(msg),
      )
      return (
        <div>
          <button data-testid="btn" onClick={() => run("oops")}>
            Run
          </button>
          <span data-testid="result">
            {result._tag === "Failure" ? String(result.error) : result._tag}
          </span>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    fireEvent.click(screen.getByTestId("btn"))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("oops")
  })

  it("resets state", async () => {
    function Test() {
      const { run, result, reset } = useEffectCallback(
        (n: number) => Effect.succeed(n),
      )
      return (
        <div>
          <button data-testid="run" onClick={() => run(42)}>
            Run
          </button>
          <button data-testid="reset" onClick={reset}>
            Reset
          </button>
          <span data-testid="result">
            {result._tag === "Success" ? String(result.value) : result._tag}
          </span>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    fireEvent.click(screen.getByTestId("run"))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("42")

    fireEvent.click(screen.getByTestId("reset"))

    expect(screen.getByTestId("result").textContent).toBe("Loading")
  })
})
