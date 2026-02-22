/**
 * RunEffectDemo — demonstrates useRunEffect
 *
 * - useRunEffect: auto-runs an Effect on mount, re-runs when deps change
 * - Automatically interrupts the previous effect when deps change
 * - Returns EffectResult (Loading | Success | Failure)
 */
import * as React from "react"
import { useRunEffect } from "effect-react"
import { Effect } from "effect"

const users: Record<number, { name: string; role: string }> = {
  1: { name: "Alice", role: "Engineer" },
  2: { name: "Bob", role: "Designer" },
  3: { name: "Charlie", role: "PM" },
}

const fetchUser = (id: number) =>
  Effect.async<{ name: string; role: string }>((resume) => {
    const timer = setTimeout(() => {
      resume(Effect.succeed(users[id] ?? { name: "Unknown", role: "Unknown" }))
    }, 600)
    return Effect.sync(() => clearTimeout(timer))
  })

export function RunEffectDemo() {
  const [userId, setUserId] = React.useState(1)

  // useRunEffect: auto-runs when deps change, interrupts previous
  const userResult = useRunEffect(fetchUser(userId), { deps: [userId] })

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[1, 2, 3].map((id) => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            style={{
              ...tabStyle,
              background: userId === id ? "#0070f3" : "#f5f5f5",
              color: userId === id ? "white" : "#333",
            }}
          >
            User {id}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, minHeight: 60 }}>
        {userResult._tag === "Loading" && <p style={{ color: "#888" }}>Loading user...</p>}
        {userResult._tag === "Failure" && <p style={{ color: "red" }}>Failed to load user</p>}
        {userResult._tag === "Success" && (
          <div>
            <p style={{ margin: 0, fontSize: 18 }}>{userResult.value.name}</p>
            <p style={{ margin: "4px 0 0", color: "#666" }}>{userResult.value.role}</p>
          </div>
        )}
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        useRunEffect auto-runs the Effect on mount and re-runs when deps change.
        <br />
        Click a different user to see it re-fetch automatically (with 600ms delay).
      </p>
    </div>
  )
}

const tabStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  cursor: "pointer",
  borderRadius: 6,
  border: "1px solid #ccc",
}
