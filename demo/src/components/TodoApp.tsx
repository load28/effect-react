/**
 * TodoApp — demonstrates atom-based reactive state with Effect services
 *
 * Uses useAtomValue to subscribe to the todo list.
 * Uses useAtomSet to trigger mutations (add/toggle/remove).
 * After each mutation, todosAtom auto-refreshes — no refreshKey or setTimeout needed.
 */
import { useState } from "react"
import { useAtomValue, useAtomSet } from "effect-react"
import { Result } from "@effect-atom/atom"
import type { Todo } from "../services"
import { todosAtom, addTodoFn, toggleTodoFn, removeTodoFn } from "../atoms"

export function TodoApp() {
  const todosResult = useAtomValue(todosAtom)
  const addTodo = useAtomSet(addTodoFn)
  const toggleTodo = useAtomSet(toggleTodoFn)
  const removeTodo = useAtomSet(removeTodoFn)

  const [input, setInput] = useState("")

  const handleAdd = () => {
    const title = input.trim()
    if (!title) return
    addTodo(title)
    setInput("")
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
      {Result.isInitial(todosResult) && <p>Loading todos...</p>}
      {Result.isFailure(todosResult) && (
        <p style={{ color: "red" }}>Error loading todos</p>
      )}
      {Result.isSuccess(todosResult) && (
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
                onChange={() => toggleTodo(todo.id)}
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
                onClick={() => removeTodo(todo.id)}
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
