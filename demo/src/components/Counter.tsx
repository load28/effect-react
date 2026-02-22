/**
 * Counter — demonstrates atom-based reactive state
 *
 * Uses useAtomValue to subscribe to counter value.
 * Uses useAtomSet to trigger mutations (increment/decrement).
 * After mutation completes, counterAtom auto-refreshes — no refreshKey needed.
 */
import { useAtomValue, useAtomSet } from "effect-react"
import { Result } from "@effect-atom/atom"
import { counterAtom, incrementFn, decrementFn } from "../atoms"

export function Counter() {
  const countResult = useAtomValue(counterAtom)
  const increment = useAtomSet(incrementFn)
  const decrement = useAtomSet(decrementFn)

  const isWaiting = Result.isWaiting(countResult)
  const displayCount = Result.isSuccess(countResult) ? countResult.value : 0

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={() => decrement()} disabled={isWaiting} style={btnStyle}>
        −
      </button>
      <span style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
        {displayCount}
      </span>
      <button onClick={() => increment()} disabled={isWaiting} style={btnStyle}>
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
