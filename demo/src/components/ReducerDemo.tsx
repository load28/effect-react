/**
 * ReducerDemo — demonstrates useEffectReducer
 *
 * - Sync actions (increment/decrement/reset) update state immediately
 * - Async actions (loadFromServer) return an Effect and show isPending
 * - Mixed reducer: same reducer handles both sync and async transitions
 */
import { Effect } from "effect"
import { useEffectReducer } from "effect-react"
import { CounterService } from "../services"

type State = { count: number; source: string }

type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset" }
  | { type: "loadFromServer" }

function reducer(
  state: State,
  action: Action,
): State | Effect.Effect<State, never, CounterService> {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1, source: "sync" }
    case "decrement":
      return { count: state.count - 1, source: "sync" }
    case "reset":
      return { count: 0, source: "sync" }
    case "loadFromServer":
      return Effect.flatMap(CounterService, (svc) => svc.get).pipe(
        Effect.delay("500 millis"),
        Effect.map((count) => ({ count, source: "server" })),
      )
  }
}

export function ReducerDemo() {
  const [state, dispatch, isPending] = useEffectReducer(reducer, {
    count: 0,
    source: "initial",
  })

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => dispatch({ type: "decrement" })} style={btnStyle}>
          −
        </button>
        <span style={{ fontSize: 24, minWidth: 48, textAlign: "center" }}>
          {state.count}
        </span>
        <button onClick={() => dispatch({ type: "increment" })} style={btnStyle}>
          +
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => dispatch({ type: "reset" })} style={smallBtnStyle}>
          Reset (sync)
        </button>
        <button
          onClick={() => dispatch({ type: "loadFromServer" })}
          disabled={isPending}
          style={smallBtnStyle}
        >
          {isPending ? "Loading..." : "Load from Service (async)"}
        </button>
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        Source: {state.source}
        {isPending && " — loading..."}
        {" | "}Sync actions are instant, async actions show isPending.
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
