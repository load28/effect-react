/**
 * Counter — demonstrates useEffectStateAsync (useState-like pattern)
 *
 * - useEffectStateAsync: initializes from Effect, setter accepts plain values or Effects
 * - No refreshKey needed — setter runs the Effect and updates state automatically
 * - Old value stays visible while Effect runs (no Loading flash)
 */
import { useEffectStateAsync } from "effect-react"
import { Effect } from "effect"
import { CounterService } from "../services"

export function Counter() {
  const [countResult, setCount] = useEffectStateAsync(
    Effect.flatMap(CounterService, (s) => s.get),
  )

  if (countResult._tag === "Loading") return <p>Loading counter...</p>
  if (countResult._tag === "Failure") return <p style={{ color: "red" }}>Failed to load counter</p>

  const handleIncrement = () => {
    setCount(Effect.flatMap(CounterService, (s) => s.increment))
  }

  const handleDecrement = () => {
    setCount(Effect.flatMap(CounterService, (s) => s.decrement))
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={handleDecrement} style={btnStyle}>
        −
      </button>
      <span style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
        {countResult.value}
      </span>
      <button onClick={handleIncrement} style={btnStyle}>
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
