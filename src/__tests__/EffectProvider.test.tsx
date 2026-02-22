import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer, Context } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useRunEffect } from "../hooks/useRunEffect.js"
import { useEffectRuntime } from "../hooks/useEffectRuntime.js"

describe("EffectProvider", () => {
  it("provides a runtime to child components", async () => {
    const TestLayer = Layer.empty

    function Child() {
      const result = useRunEffect(Effect.succeed("hello"))
      return <div data-testid="result">{result._tag}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Child />
      </EffectProvider>,
    )

    // Initially loading
    expect(screen.getByTestId("result").textContent).toBe("Loading")

    // Wait for effect to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("Success")
  })

  it("throws when useEffectRuntime is used outside provider", () => {
    function Bad() {
      useEffectRuntime()
      return null
    }

    expect(() => render(<Bad />)).toThrow("No EffectProvider found")
  })

  it("renders children that don't use Effect hooks", () => {
    const TestLayer = Layer.empty

    function PureChild() {
      const [count, setCount] = React.useState(0)
      return <div data-testid="count">{count}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <PureChild />
      </EffectProvider>,
    )

    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("supports nested providers with layer scoping", async () => {
    class Greeting extends Context.Tag("Greeting")<
      Greeting,
      { readonly message: string }
    >() {}

    const OuterLayer = Layer.succeed(Greeting, { message: "outer" })
    const InnerLayer = Layer.succeed(Greeting, { message: "inner" })

    function ShowGreeting({ testId }: { testId: string }) {
      const result = useRunEffect(
        Effect.map(Greeting, (g) => g.message),
      )
      return (
        <div data-testid={testId}>
          {result._tag === "Success" ? result.value : result._tag}
        </div>
      )
    }

    render(
      <EffectProvider layer={OuterLayer}>
        <ShowGreeting testId="outer" />
        <EffectProvider layer={InnerLayer}>
          <ShowGreeting testId="inner" />
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("outer").textContent).toBe("outer")
    expect(screen.getByTestId("inner").textContent).toBe("inner")
  })
})
