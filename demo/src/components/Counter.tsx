/**
 * Counter — demonstrates useService + useEffectCallback
 *
 * - useService: resolves CounterService from the provider layer
 * - useEffectCallback: wraps service methods as on-demand callbacks
 */
import { useState } from "react"
import { useService, useRunEffect, useEffectCallback } from "effect-react"
import { Effect } from "effect"
import { CounterService } from "../services"

export function Counter() {
  const svc = useService(CounterService)
  const [refreshKey, setRefreshKey] = useState(0)

  // Read current count value, re-fetch when refreshKey changes
  const countResult = useRunEffect(
    Effect.flatMap(CounterService, (s) => s.get),
    { deps: [refreshKey] },
  )

  const { run: doIncrement, isLoading: incLoading } = useEffectCallback(() =>
    Effect.flatMap(CounterService, (s) => s.increment),
  )

  const { run: doDecrement, isLoading: decLoading } = useEffectCallback(() =>
    Effect.flatMap(CounterService, (s) => s.decrement),
  )

  if (svc._tag === "Loading") return <p>Loading counter service...</p>
  if (svc._tag === "Failure") return <p style={{ color: "red" }}>Failed to load counter service</p>

  const displayCount = countResult._tag === "Success" ? countResult.value : 0

  const handleIncrement = () => {
    doIncrement()
    setTimeout(() => setRefreshKey((k) => k + 1), 50)
  }

  const handleDecrement = () => {
    doDecrement()
    setTimeout(() => setRefreshKey((k) => k + 1), 50)
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={handleDecrement} disabled={decLoading} style={btnStyle}>
        −
      </button>
      <span style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
        {displayCount}
      </span>
      <button onClick={handleIncrement} disabled={incLoading} style={btnStyle}>
        +
      </button>
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
