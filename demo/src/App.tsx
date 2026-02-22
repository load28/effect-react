import { EffectProvider } from "effect-react"
import { AppLayer } from "./services"
import { Counter } from "./components/Counter"
import { RunEffectDemo } from "./components/RunEffectDemo"
import { SyncCounter } from "./components/SyncCounter"
import { TodoApp } from "./components/TodoApp"
import { AsyncDemo } from "./components/AsyncDemo"
import { NestedProviderDemo } from "./components/NestedProviderDemo"

export function App() {
  return (
    <EffectProvider layer={AppLayer}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>effect-react Demo</h1>
        <p style={{ color: "#666" }}>
          Demonstrating all hooks: useService, useEffectCallback, useRunEffect,
          useEffectState, useEffectStateAsync + nested EffectProvider
        </p>
        <hr />

        <section style={{ marginBottom: 32 }}>
          <h2>1. useService + useEffectCallback</h2>
          <Counter />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>2. useRunEffect</h2>
          <RunEffectDemo />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>3. useEffectState</h2>
          <SyncCounter />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>4. useEffectStateAsync — Todo List</h2>
          <TodoApp />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>5. useEffectStateAsync — Async + isPending</h2>
          <AsyncDemo />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2>6. Nested EffectProvider</h2>
          <NestedProviderDemo />
        </section>
      </div>
    </EffectProvider>
  )
}
