import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer, Context } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useEffectMemo } from "../hooks/useEffectMemo.js"

const TestLayer = Layer.empty

describe("useEffectMemo", () => {
  it("returns the computed value immediately", () => {
    function Test() {
      const value = useEffectMemo(
        () => Effect.succeed(21 * 2),
        [],
      )
      return <div data-testid="result">{value}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("42")
  })

  it("memoizes — does not recompute when deps are unchanged", () => {
    const computeFn = vi.fn(() => Effect.succeed(Math.random()))

    function Test({ unrelated }: { unrelated: string }) {
      const value = useEffectMemo(computeFn, [])
      return (
        <div>
          <div data-testid="result">{value}</div>
          <div data-testid="unrelated">{unrelated}</div>
        </div>
      )
    }

    const { rerender } = render(
      <EffectProvider layer={TestLayer}>
        <Test unrelated="a" />
      </EffectProvider>,
    )

    const firstValue = screen.getByTestId("result").textContent

    // Re-render with different unrelated prop — deps haven't changed
    rerender(
      <EffectProvider layer={TestLayer}>
        <Test unrelated="b" />
      </EffectProvider>,
    )

    const secondValue = screen.getByTestId("result").textContent
    expect(secondValue).toBe(firstValue)

    // computeFn should only have been called once
    expect(computeFn).toHaveBeenCalledTimes(1)
  })

  it("recomputes when dependencies change", () => {
    function Test({ multiplier }: { multiplier: number }) {
      const value = useEffectMemo(
        () => Effect.succeed(10 * multiplier),
        [multiplier],
      )
      return <div data-testid="result">{value}</div>
    }

    const { rerender } = render(
      <EffectProvider layer={TestLayer}>
        <Test multiplier={1} />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("10")

    rerender(
      <EffectProvider layer={TestLayer}>
        <Test multiplier={5} />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("50")
  })

  it("can access services from the provider", () => {
    class MathService extends Context.Tag("MathService")<
      MathService,
      { readonly double: (n: number) => number }
    >() {}

    const MathServiceLive = Layer.succeed(MathService, {
      double: (n: number) => n * 2,
    })

    function Test({ input }: { input: number }) {
      const result = useEffectMemo(
        () =>
          Effect.map(MathService, (svc) => svc.double(input)),
        [input],
      )
      return <div data-testid="result">{result}</div>
    }

    render(
      <EffectProvider layer={MathServiceLive}>
        <Test input={7} />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("14")
  })

  it("works with Effect.sync for side-effect-free computations", () => {
    function Test({ items }: { items: number[] }) {
      const sum = useEffectMemo(
        () => Effect.sync(() => items.reduce((a, b) => a + b, 0)),
        [items],
      )
      return <div data-testid="result">{sum}</div>
    }

    const items = [1, 2, 3, 4, 5]

    render(
      <EffectProvider layer={TestLayer}>
        <Test items={items} />
      </EffectProvider>,
    )

    expect(screen.getByTestId("result").textContent).toBe("15")
  })
})
