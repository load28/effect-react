/**
 * TodoApp — demonstrates useRunEffect + useService + useEffectCallback
 *
 * - useRunEffect: auto-fetches todo list on mount
 * - useEffectCallback: add / toggle / remove actions triggered by user
 */
import { useState } from "react"
import { useRunEffect, useEffectCallback } from "effect-react"
import { Effect } from "effect"
import { TodoService, type Todo } from "../services"

export function TodoApp() {
  const [refreshKey, setRefreshKey] = useState(0)

  // Auto-fetch all todos (re-runs when refreshKey changes)
  const todosResult = useRunEffect(
    Effect.flatMap(TodoService, (s) => s.getAll),
    { deps: [refreshKey] },
  )

  const { run: addTodo, isLoading: adding } = useEffectCallback(
    (title: string) =>
      Effect.flatMap(TodoService, (s) => s.add(title)),
  )

  const { run: toggleTodo } = useEffectCallback(
    (id: number) =>
      Effect.flatMap(TodoService, (s) => s.toggle(id)),
  )

  const { run: removeTodo } = useEffectCallback(
    (id: number) =>
      Effect.flatMap(TodoService, (s) => s.remove(id)),
  )

  const [input, setInput] = useState("")

  const handleAdd = () => {
    const title = input.trim()
    if (!title) return
    addTodo(title)
    setInput("")
    // Refresh list after a short delay to let the effect complete
    setTimeout(() => setRefreshKey((k) => k + 1), 50)
  }

  const handleToggle = (id: number) => {
    toggleTodo(id)
    setTimeout(() => setRefreshKey((k) => k + 1), 50)
  }

  const handleRemove = (id: number) => {
    removeTodo(id)
    setTimeout(() => setRefreshKey((k) => k + 1), 50)
  }

  return (
    <div>
      {/* Add form */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a todo..."
          style={{ flex: 1, padding: 8, fontSize: 14, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button onClick={handleAdd} disabled={adding} style={addBtnStyle}>
          Add
        </button>
      </div>

      {/* Todo list */}
      {todosResult._tag === "Loading" && <p>Loading todos...</p>}
      {todosResult._tag === "Failure" && (
        <p style={{ color: "red" }}>Error loading todos</p>
      )}
      {todosResult._tag === "Success" && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {todosResult.value.map((todo: Todo) => (
            <li
              key={todo.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo.id)}
              />
              <span
                style={{
                  flex: 1,
                  textDecoration: todo.completed ? "line-through" : "none",
                  color: todo.completed ? "#999" : "#333",
                }}
              >
                {todo.title}
              </span>
              <button
                onClick={() => handleRemove(todo.id)}
                style={{ cursor: "pointer", color: "red", background: "none", border: "none" }}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const addBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  cursor: "pointer",
  borderRadius: 4,
  border: "1px solid #0070f3",
  background: "#0070f3",
  color: "white",
}
