import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Layer } from "effect"
import { Atom, Result } from "@effect-atom/atom"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useAtomValue } from "../hooks/useAtomValue.js"
import { useAtomSet } from "../hooks/useAtomSet.js"
import { useAtom } from "../hooks/useAtom.js"
import { useAtomRefresh } from "../hooks/useAtomRefresh.js"
import { useRegistry } from "../hooks/useRegistry.js"

const TestLayer = Layer.empty

describe("useAtomValue", () => {
  it("reads a simple atom value", async () => {
    const counterAtom = Atom.make(42)

    function Test() {
      const value = useAtomValue(counterAtom)
      return <div data-testid="value">{value}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Test />
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(screen.getByTestId("value").textContent).toBe("42")
  })

  it("re-renders when atom value changes", async () => {
    const counterAtom = Atom.make(0)

    function Test() {
      const value = useAtomValue(counterAtom)
      const set = useAtomSet(counterAtom)
      return (
        <div>
          <div data-testid="value">{value}</div>
          <button data-testid="inc" onClick={() => set(value + 1)}>
            +
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
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(screen.getByTestId("value").textContent).toBe("0")

    await act(async () => {
      screen.getByTestId("inc").click()
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(screen.getByTestId("value").textContent).toBe("1")
  })
})

describe("useAtom", () => {
  it("returns [value, setter] tuple", async () => {
    const nameAtom = Atom.make("hello")

    function Test() {
      const [name, setName] = useAtom(nameAtom)
      return (
        <div>
          <div data-testid="name">{name}</div>
          <button data-testid="change" onClick={() => setName("world")}>
            Change
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
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(screen.getByTestId("name").textContent).toBe("hello")

    await act(async () => {
      screen.getByTestId("change").click()
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(screen.getByTestId("name").textContent).toBe("world")
  })
})

describe("useRegistry", () => {
  it("throws when used outside EffectProvider", () => {
    function Bad() {
      useRegistry()
      return null
    }

    expect(() => render(<Bad />)).toThrow("No EffectProvider found")
  })
})
