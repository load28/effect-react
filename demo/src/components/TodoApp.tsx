/**
 * TodoApp — demonstrates useEffectState (useState-like pattern)
 *
 * - useEffectState: initializes todo list from Effect, setter re-fetches after mutations
 * - No refreshKey needed — setter runs the Effect and updates state automatically
 * - Old list stays visible while mutations run (no Loading flash)
 */
import { useState } from "react"
import { useEffectState } from "effect-react"
import { Effect } from "effect"
import { TodoService, type Todo } from "../services"

export function TodoApp() {
  const [todosResult, setTodos] = useEffectState(
    Effect.flatMap(TodoService, (s) => s.getAll),
  )

  const [input, setInput] = useState("")

  const handleAdd = () => {
    const title = input.trim()
    if (!title) return
    setInput("")
    setTodos(
      Effect.flatMap(TodoService, (s) =>
        Effect.flatMap(s.add(title), () => s.getAll),
      ),
    )
  }

  const handleToggle = (id: number) => {
    setTodos(
      Effect.flatMap(TodoService, (s) =>
        Effect.flatMap(s.toggle(id), () => s.getAll),
      ),
    )
  }

  const handleRemove = (id: number) => {
    setTodos(
      Effect.flatMap(TodoService, (s) =>
        Effect.flatMap(s.remove(id), () => s.getAll),
      ),
    )
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
        <button onClick={handleAdd} style={addBtnStyle}>
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
