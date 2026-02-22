/**
 * SyncCounter — demonstrates useEffectState (sync hook)
 *
 * - No Loading state — value is available immediately on first render
 * - Uses Effect.succeed/Effect.sync for synchronous state updates
 */
import { Effect } from "effect"
import { useEffectState } from "effect-react"

export function SyncCounter() {
  const [count, setCount] = useEffectState(Effect.succeed(0))

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setCount(Effect.succeed(count - 1))} style={btnStyle}>
          −
        </button>
        <span style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
          {count}
        </span>
        <button onClick={() => setCount(Effect.succeed(count + 1))} style={btnStyle}>
          +
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => setCount(0)} style={smallBtnStyle}>
          Reset (plain value)
        </button>
        <button
          onClick={() => setCount(Effect.sync(() => Math.floor(Math.random() * 100)))}
          style={smallBtnStyle}
        >
          Random (Effect.sync)
        </button>
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        Sync hook — no Loading state. Value is available on first render.
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
