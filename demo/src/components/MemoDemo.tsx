/**
 * MemoDemo — demonstrates useEffectMemo
 *
 * - Memoizes expensive computations via Effect
 * - Re-computes only when dependencies change
 * - Can access services in memoized computations
 */
import { useState } from "react"
import { Effect } from "effect"
import { useEffectMemo } from "effect-react"

export function MemoDemo() {
  const [items, setItems] = useState([5, 3, 8, 1, 9, 2, 7, 4, 6])
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Memoize sorting via Effect — only recomputes when items or sortOrder change
  const sorted = useEffectMemo(
    () =>
      Effect.sync(() =>
        [...items].sort((a, b) => (sortOrder === "asc" ? a - b : b - a)),
      ),
    [items, sortOrder],
  )

  // Memoize aggregate computation
  const stats = useEffectMemo(
    () =>
      Effect.sync(() => ({
        sum: items.reduce((a, b) => a + b, 0),
        avg: items.reduce((a, b) => a + b, 0) / items.length,
        min: Math.min(...items),
        max: Math.max(...items),
      })),
    [items],
  )

  const addRandom = () => {
    setItems((prev) => [...prev, Math.floor(Math.random() * 100)])
  }

  const removeFirst = () => {
    setItems((prev) => prev.slice(1))
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={addRandom} style={smallBtnStyle}>
          Add Random
        </button>
        <button onClick={removeFirst} disabled={items.length === 0} style={smallBtnStyle}>
          Remove First
        </button>
        <button
          onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
          style={smallBtnStyle}
        >
          Sort: {sortOrder === "asc" ? "Ascending" : "Descending"}
        </button>
      </div>

      <div style={{ fontFamily: "monospace", fontSize: 14, marginBottom: 8 }}>
        Sorted: [{sorted.join(", ")}]
      </div>

      <div style={{ fontSize: 13, color: "#555" }}>
        Sum: {stats.sum} | Avg: {stats.avg.toFixed(1)} | Min: {stats.min} | Max: {stats.max}
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        Memoized via useEffectMemo — recomputes only when items or sort order change.
      </p>
    </div>
  )
}

const smallBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fafafa",
}
