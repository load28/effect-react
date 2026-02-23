import { useState } from "react"
import { EffectProvider } from "effect-react"
import { AppLayer } from "./services"
import { Counter } from "./components/Counter"
import { RunEffectDemo } from "./components/RunEffectDemo"
import { SyncCounter } from "./components/SyncCounter"
import { TodoApp } from "./components/TodoApp"
import { AsyncDemo } from "./components/AsyncDemo"
import { ReducerDemo } from "./components/ReducerDemo"
import { MemoDemo } from "./components/MemoDemo"
import { NestedProviderDemo } from "./components/NestedProviderDemo"
import { BankApp } from "./bank/BankApp"

type Tab = "hooks" | "bank"

export function App() {
  const [tab, setTab] = useState<Tab>("bank")

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>effect-react Demo</h1>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        <button
          onClick={() => setTab("bank")}
          style={{
            ...tabBtnStyle,
            background: tab === "bank" ? "#3182ce" : "#edf2f7",
            color: tab === "bank" ? "#fff" : "#4a5568",
          }}
        >
          Bank App (Effect Showcase)
        </button>
        <button
          onClick={() => setTab("hooks")}
          style={{
            ...tabBtnStyle,
            background: tab === "hooks" ? "#3182ce" : "#edf2f7",
            color: tab === "hooks" ? "#fff" : "#4a5568",
          }}
        >
          Hook Examples
        </button>
      </div>

      {tab === "bank" && <BankApp />}

      {tab === "hooks" && (
        <EffectProvider layer={AppLayer}>
          <p style={{ color: "#666" }}>
            Demonstrating all hooks: useService, useEffectCallback, useRunEffect,
            useEffectState, useEffectStateAsync, useEffectReducer, useEffectMemo + nested EffectProvider
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
            <h2>6. useEffectReducer — Sync/Async Reducer</h2>
            <ReducerDemo />
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2>7. useEffectMemo — Memoized Effect Computation</h2>
            <MemoDemo />
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2>8. Nested EffectProvider</h2>
            <NestedProviderDemo />
          </section>
        </EffectProvider>
      )}
    </div>
  )
}

const tabBtnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.15s",
  fontFamily: "inherit",
}
