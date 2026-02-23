import { describe, it, expect } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer, Context } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useEffectReducer } from "../hooks/useEffectReducer.js"

const TestLayer = Layer.empty

describe("useEffectReducer", () => {
  it("returns initial state immediately", () => {
    type Action = { type: "increment" }

    function reducer(state: number, action: Action): number {
      return state + 1
    }

    function Test() {
      const [state] = useEffectReducer(reducer, 0)
      return <div data-testid="result">{state}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("0")
  })

  it("handles sync dispatch — plain value from reducer", () => {
    type Action = { type: "increment" } | { type: "decrement" }

    function reducer(state: number, action: Action): number {
      switch (action.type) {
        case "increment":
          return state + 1
        case "decrement":
          return state - 1
      }
    }

    function Test() {
      const [state, dispatch] = useEffectReducer(reducer, 0)
      return (
        <div>
          <div data-testid="result">{state}</div>
          <button data-testid="inc" onClick={() => dispatch({ type: "increment" })}>
            +
          </button>
          <button data-testid="dec" onClick={() => dispatch({ type: "decrement" })}>
            -
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

    fireEvent.click(screen.getByTestId("inc"))
    expect(screen.getByTestId("result").textContent).toBe("1")

    fireEvent.click(screen.getByTestId("inc"))
    expect(screen.getByTestId("result").textContent).toBe("2")

    fireEvent.click(screen.getByTestId("dec"))
    expect(screen.getByTestId("result").textContent).toBe("1")
  })

  it("handles async dispatch — Effect from reducer", async () => {
    type Action = { type: "loadAsync" }

    function reducer(
      state: number,
      action: Action,
    ): Effect.Effect<number, never, never> {
      return Effect.delay(Effect.succeed(42), "50 millis")
    }

    function Test() {
      const [state, dispatch, isPending] = useEffectReducer(reducer, 0)
      return (
        <div>
          <div data-testid="result">{state}</div>
          <div data-testid="pending">{String(isPending)}</div>
          <button data-testid="btn" onClick={() => dispatch({ type: "loadAsync" })}>
            Load
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
    expect(screen.getByTestId("pending").textContent).toBe("false")

    fireEvent.click(screen.getByTestId("btn"))

    // State stays at 0 (old value visible), isPending becomes true
    expect(screen.getByTestId("result").textContent).toBe("0")
    expect(screen.getByTestId("pending").textContent).toBe("true")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("42")
    expect(screen.getByTestId("pending").textContent).toBe("false")
  })

  it("mixed sync and async actions in the same reducer", async () => {
    type Action =
      | { type: "increment" }
      | { type: "reset" }
      | { type: "loadAsync" }

    function reducer(
      state: number,
      action: Action,
    ): number | Effect.Effect<number, never, never> {
      switch (action.type) {
        case "increment":
          return state + 1
        case "reset":
          return 0
        case "loadAsync":
          return Effect.delay(Effect.succeed(100), "50 millis")
      }
    }

    function Test() {
      const [state, dispatch, isPending] = useEffectReducer(reducer, 0)
      return (
        <div>
          <div data-testid="result">{state}</div>
          <div data-testid="pending">{String(isPending)}</div>
          <button data-testid="inc" onClick={() => dispatch({ type: "increment" })}>
            +
          </button>
          <button data-testid="reset" onClick={() => dispatch({ type: "reset" })}>
            Reset
          </button>
          <button data-testid="load" onClick={() => dispatch({ type: "loadAsync" })}>
            Load
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    // Sync actions
    fireEvent.click(screen.getByTestId("inc"))
    fireEvent.click(screen.getByTestId("inc"))
    expect(screen.getByTestId("result").textContent).toBe("2")

    // Async action
    fireEvent.click(screen.getByTestId("load"))
    expect(screen.getByTestId("result").textContent).toBe("2")
    expect(screen.getByTestId("pending").textContent).toBe("true")

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("100")
    expect(screen.getByTestId("pending").textContent).toBe("false")

    // Sync action after async
    fireEvent.click(screen.getByTestId("reset"))
    expect(screen.getByTestId("result").textContent).toBe("0")
  })

  it("sync dispatch interrupts pending async Effect", async () => {
    type Action =
      | { type: "loadSlow" }
      | { type: "setImmediate" }

    function reducer(
      state: number,
      action: Action,
    ): number | Effect.Effect<number, never, never> {
      switch (action.type) {
        case "loadSlow":
          return Effect.delay(Effect.succeed(999), "200 millis")
        case "setImmediate":
          return 42
      }
    }

    function Test() {
      const [state, dispatch, isPending] = useEffectReducer(reducer, 0)
      return (
        <div>
          <div data-testid="result">{state}</div>
          <div data-testid="pending">{String(isPending)}</div>
          <button data-testid="slow" onClick={() => dispatch({ type: "loadSlow" })}>
            Slow
          </button>
          <button data-testid="immediate" onClick={() => dispatch({ type: "setImmediate" })}>
            Immediate
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    // Start slow async
    fireEvent.click(screen.getByTestId("slow"))
    expect(screen.getByTestId("pending").textContent).toBe("true")

    // Immediately dispatch sync action — should interrupt the async
    fireEvent.click(screen.getByTestId("immediate"))
    expect(screen.getByTestId("result").textContent).toBe("42")
    expect(screen.getByTestId("pending").textContent).toBe("false")

    // Wait for the slow effect's timeout to pass
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300))
    })

    // Slow result (999) should NOT have overwritten the sync result
    expect(screen.getByTestId("result").textContent).toBe("42")
  })

  it("rapid async dispatches: last one wins", async () => {
    type Action = { type: "load"; label: string; delay: number }

    function reducer(
      state: string,
      action: Action,
    ): Effect.Effect<string, never, never> {
      return Effect.delay(Effect.succeed(action.label), `${action.delay} millis`)
    }

    function Test() {
      const [state, dispatch, isPending] = useEffectReducer(reducer, "initial")
      return (
        <div>
          <div data-testid="result">{state}</div>
          <div data-testid="pending">{String(isPending)}</div>
          <button
            data-testid="slow"
            onClick={() => dispatch({ type: "load", label: "slow-result", delay: 200 })}
          >
            Slow
          </button>
          <button
            data-testid="fast"
            onClick={() => dispatch({ type: "load", label: "fast-result", delay: 50 })}
          >
            Fast
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    // Dispatch slow then fast
    fireEvent.click(screen.getByTestId("slow"))
    fireEvent.click(screen.getByTestId("fast"))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("result").textContent).toBe("fast-result")

    // Wait for slow to have potentially completed
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    // Still fast-result
    expect(screen.getByTestId("result").textContent).toBe("fast-result")
    expect(screen.getByTestId("pending").textContent).toBe("false")
  })

  it("reducer can access services via Effect", async () => {
    class CounterService extends Context.Tag("CounterService")<
      CounterService,
      { readonly load: Effect.Effect<number> }
    >() {}

    const CounterServiceLive = Layer.succeed(CounterService, {
      load: Effect.succeed(777),
    })

    type Action = { type: "loadFromService" }

    function reducer(
      state: number,
      action: Action,
    ): Effect.Effect<number, never, CounterService> {
      return Effect.flatMap(CounterService, (s) => s.load)
    }

    function Test() {
      const [state, dispatch, isPending] = useEffectReducer(reducer, 0)
      return (
        <div>
          <div data-testid="result">{state}</div>
          <div data-testid="pending">{String(isPending)}</div>
          <button data-testid="btn" onClick={() => dispatch({ type: "loadFromService" })}>
            Load
          </button>
        </div>
      )
    }

    render(
      <EffectProvider layer={CounterServiceLive}>
        <Test />
      </EffectProvider>,
    )

    fireEvent.click(screen.getByTestId("btn"))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("777")
    expect(screen.getByTestId("pending").textContent).toBe("false")
  })
})
