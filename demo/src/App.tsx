import { EffectProvider } from "effect-react"
import { AppLayer } from "./services"
import { TodoApp } from "./components/TodoApp"
import { Counter } from "./components/Counter"
import { AsyncDemo } from "./components/AsyncDemo"

export function App() {
  return (
    <EffectProvider layer={AppLayer}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>effect-react Demo</h1>
        <p style={{ color: "#666" }}>
          Demonstrating all hooks: useRunEffect, useEffectState, useService, useEffectCallback
        </p>
        <hr />

        <section style={{ marginBottom: 32 }}>
          <h2>1. useService + useEffectCallback — Counter</h2>
          <Counter />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>2. useRunEffect + useService — Todo List</h2>
          <TodoApp />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>3. useEffectState — Async Demo</h2>
          <AsyncDemo />
        </section>
      </div>
    </EffectProvider>
  )
}
