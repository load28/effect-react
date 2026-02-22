/**
 * Counter — demonstrates useService + useEffectCallback
 *
 * - useService: resolves CounterService from the EffectProvider's Layer
 * - useEffectCallback: manually triggers increment/decrement Effects,
 *   tracks result, loading state, and supports reset
 */
import * as React from "react"
import { useService, useEffectCallback } from "effect-react"
import { Effect } from "effect"
import { CounterService } from "../services"

const counterAction = (action: "get" | "increment" | "decrement") =>
  Effect.flatMap(CounterService, (s) =>
    action === "increment" ? s.increment :
    action === "decrement" ? s.decrement :
    s.get
  )

export function Counter() {
  const service = useService(CounterService)
  const { run, result, isLoading, reset } = useEffectCallback(counterAction)

  const serviceReady = service._tag === "Success"
  React.useEffect(() => {
    if (serviceReady) run("get")
  }, [serviceReady, run])

  if (!serviceReady) return <p>Resolving CounterService...</p>

  const count = result._tag === "Success" ? result.value : "..."

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => run("decrement")} disabled={isLoading} style={btnStyle}>
          −
        </button>
        <span data-testid="counter-value" style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
          {count}
        </span>
        <button onClick={() => run("increment")} disabled={isLoading} style={btnStyle}>
          +
        </button>
        <button onClick={() => reset()} style={smallBtnStyle}>
          Reset
        </button>
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        useService resolves CounterService from the Layer.
        <br />
        useEffectCallback triggers operations and tracks result + loading state.
      </p>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  fontSize: 20,
  width: 40,
  height: 40,
  cursor: "pointer",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#f5f5f5",
}

const smallBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fafafa",
}
