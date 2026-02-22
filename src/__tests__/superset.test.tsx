import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"

/**
 * Superset principle tests:
 * Verify that standard React code works when imported from effect-react.
 */
import { useState, useEffect, useCallback, useMemo, useRef, memo, Fragment } from "../index.js"

describe("Superset principle: React re-exports", () => {
  it("useState works identically to React", () => {
    function Counter() {
      const [count, setCount] = useState(0)
      return (
        <button data-testid="btn" onClick={() => setCount((c) => c + 1)}>
          {count}
        </button>
      )
    }

    render(<Counter />)
    expect(screen.getByTestId("btn").textContent).toBe("0")

    fireEvent.click(screen.getByTestId("btn"))
    expect(screen.getByTestId("btn").textContent).toBe("1")
  })

  it("useEffect works identically to React", async () => {
    function Effected() {
      const [val, setVal] = useState("before")
      useEffect(() => {
        setVal("after")
      }, [])
      return <div data-testid="val">{val}</div>
    }

    render(<Effected />)
    // After render + effect, should be "after"
    expect(screen.getByTestId("val").textContent).toBe("after")
  })

  it("useCallback and useMemo work", () => {
    function Test() {
      const cb = useCallback(() => "memoized", [])
      const val = useMemo(() => cb(), [cb])
      return <div data-testid="val">{val}</div>
    }

    render(<Test />)
    expect(screen.getByTestId("val").textContent).toBe("memoized")
  })

  it("useRef works", () => {
    function Test() {
      const ref = useRef<HTMLDivElement>(null)
      return <div ref={ref} data-testid="ref">has ref</div>
    }

    render(<Test />)
    expect(screen.getByTestId("ref").textContent).toBe("has ref")
  })

  it("memo works", () => {
    const MemoizedComponent = memo(function Inner({ text }: { text: string }) {
      return <div data-testid="memo">{text}</div>
    })

    render(<MemoizedComponent text="hello" />)
    expect(screen.getByTestId("memo").textContent).toBe("hello")
  })

  it("Fragment works", () => {
    function Test() {
      return (
        <Fragment>
          <span data-testid="a">A</span>
          <span data-testid="b">B</span>
        </Fragment>
      )
    }

    render(<Test />)
    expect(screen.getByTestId("a").textContent).toBe("A")
    expect(screen.getByTestId("b").textContent).toBe("B")
  })
})
