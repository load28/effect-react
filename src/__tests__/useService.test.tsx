import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Context, Layer } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useService } from "../hooks/useService.js"

class UserRepo extends Context.Tag("UserRepo")<
  UserRepo,
  { readonly findAll: () => string[] }
>() {}

const TestLayer = Layer.succeed(UserRepo, {
  findAll: () => ["Alice", "Bob"],
})

describe("useService", () => {
  it("resolves a service from the layer", async () => {
    function Test() {
      const result = useService(UserRepo)
      return (
        <div data-testid="result">
          {result._tag === "Success"
            ? result.value.findAll().join(", ")
            : result._tag}
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

    expect(screen.getByTestId("result").textContent).toBe("Alice, Bob")
  })

  it("starts in Loading state", () => {
    function Test() {
      const result = useService(UserRepo)
      return <div data-testid="tag">{result._tag}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    expect(screen.getByTestId("tag").textContent).toBe("Loading")
  })
})
