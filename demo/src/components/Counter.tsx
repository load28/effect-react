/**
 * Counter — demonstrates useSubscriptionRef + useEffectCallback
 *
 * - useService: resolves CounterService from the provider layer
 * - useSubscriptionRef: subscribes to countRef for automatic reactivity
 * - useEffectCallback: wraps service methods as on-demand callbacks
 *
 * No refreshKey needed — SubscriptionRef changes automatically
 * propagate to the component through useSubscriptionRef.
 */
import { useService, useSubscriptionRef, useEffectCallback } from "effect-react"
import { Effect } from "effect"
import { CounterService } from "../services"

export function Counter() {
  const svc = useService(CounterService)

  // Reactive subscription to counter value — updates automatically on any mutation
  const countResult = useSubscriptionRef(
    svc._tag === "Success" ? svc.value.countRef : undefined,
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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={() => doDecrement()} disabled={decLoading} style={btnStyle}>
        −
      </button>
      <span style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
        {displayCount}
      </span>
      <button onClick={() => doIncrement()} disabled={incLoading} style={btnStyle}>
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
