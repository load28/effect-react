import { describe, it, expect } from "vitest"
import { render, screen, act } from "@testing-library/react"
import * as React from "react"
import { Effect, Layer, Context } from "effect"
import { EffectProvider } from "../providers/EffectProvider.js"
import { useRunEffect } from "../hooks/useRunEffect.js"
import { useEffectRuntime } from "../hooks/useEffectRuntime.js"

describe("EffectProvider", () => {
  it("provides a runtime to child components", async () => {
    const TestLayer = Layer.empty

    function Child() {
      const result = useRunEffect(Effect.succeed("hello"))
      return <div data-testid="result">{result._tag}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <Child />
      </EffectProvider>,
    )

    // Initially loading
    expect(screen.getByTestId("result").textContent).toBe("Loading")

    // Wait for effect to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("result").textContent).toBe("Success")
  })

  it("throws when useEffectRuntime is used outside provider", () => {
    function Bad() {
      useEffectRuntime()
      return null
    }

    expect(() => render(<Bad />)).toThrow("No EffectProvider found")
  })

  it("renders children that don't use Effect hooks", () => {
    const TestLayer = Layer.empty

    function PureChild() {
      const [count, setCount] = React.useState(0)
      return <div data-testid="count">{count}</div>
    }

    render(
      <EffectProvider layer={TestLayer}>
        <PureChild />
      </EffectProvider>,
    )

    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("supports nested providers with layer scoping", async () => {
    class Greeting extends Context.Tag("Greeting")<
      Greeting,
      { readonly message: string }
    >() {}

    const OuterLayer = Layer.succeed(Greeting, { message: "outer" })
    const InnerLayer = Layer.succeed(Greeting, { message: "inner" })

    function ShowGreeting({ testId }: { testId: string }) {
      const result = useRunEffect(
        Effect.map(Greeting, (g) => g.message),
      )
      return (
        <div data-testid={testId}>
          {result._tag === "Success" ? result.value : result._tag}
        </div>
      )
    }

    render(
      <EffectProvider layer={OuterLayer}>
        <ShowGreeting testId="outer" />
        <EffectProvider layer={InnerLayer}>
          <ShowGreeting testId="inner" />
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("outer").textContent).toBe("outer")
    expect(screen.getByTestId("inner").textContent).toBe("inner")
  })

  it("nested provider inherits parent services via layer merging", async () => {
    class ServiceA extends Context.Tag("ServiceA")<
      ServiceA,
      { readonly value: string }
    >() {}

    class ServiceB extends Context.Tag("ServiceB")<
      ServiceB,
      { readonly value: string }
    >() {}

    const ParentLayer = Layer.succeed(ServiceA, { value: "from-parent" })
    const ChildLayer = Layer.succeed(ServiceB, { value: "from-child" })

    function ShowBoth() {
      const a = useRunEffect(Effect.map(ServiceA, (s) => s.value))
      const b = useRunEffect(Effect.map(ServiceB, (s) => s.value))
      return (
        <div>
          <div data-testid="a">
            {a._tag === "Success" ? a.value : a._tag}
          </div>
          <div data-testid="b">
            {b._tag === "Success" ? b.value : b._tag}
          </div>
        </div>
      )
    }

    render(
      <EffectProvider layer={ParentLayer}>
        <EffectProvider layer={ChildLayer}>
          <ShowBoth />
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // Child inherits ServiceA from parent, provides its own ServiceB
    expect(screen.getByTestId("a").textContent).toBe("from-parent")
    expect(screen.getByTestId("b").textContent).toBe("from-child")
  })

  it("nested provider overrides parent service while keeping others", async () => {
    class ServiceA extends Context.Tag("ServiceA-override")<
      ServiceA,
      { readonly value: string }
    >() {}

    class ServiceB extends Context.Tag("ServiceB-override")<
      ServiceB,
      { readonly value: string }
    >() {}

    const ParentLayer = Layer.mergeAll(
      Layer.succeed(ServiceA, { value: "parent-A" }),
      Layer.succeed(ServiceB, { value: "parent-B" }),
    )
    // Child overrides ServiceA but not ServiceB
    const ChildLayer = Layer.succeed(ServiceA, { value: "child-A" })

    function ShowBoth() {
      const a = useRunEffect(Effect.map(ServiceA, (s) => s.value))
      const b = useRunEffect(Effect.map(ServiceB, (s) => s.value))
      return (
        <div>
          <div data-testid="a">
            {a._tag === "Success" ? a.value : a._tag}
          </div>
          <div data-testid="b">
            {b._tag === "Success" ? b.value : b._tag}
          </div>
        </div>
      )
    }

    render(
      <EffectProvider layer={ParentLayer}>
        <EffectProvider layer={ChildLayer}>
          <ShowBoth />
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // ServiceA is overridden by child, ServiceB inherited from parent
    expect(screen.getByTestId("a").textContent).toBe("child-A")
    expect(screen.getByTestId("b").textContent).toBe("parent-B")
  })

  it("nested provider shares parent service instances (same object reference)", async () => {
    // The core Angular-style DI guarantee: parent and child share the same
    // service object — not separate copies rebuilt from the Layer definition.
    const sharedInstance = { value: "shared", mutated: false }

    class SharedService extends Context.Tag("SharedService")<
      SharedService,
      typeof sharedInstance
    >() {}

    const ParentLayer = Layer.succeed(SharedService, sharedInstance)
    const ChildLayer = Layer.empty // child adds nothing, just inherits

    // Capture service references from parent and child scopes
    const capturedRefs: { parent?: typeof sharedInstance; child?: typeof sharedInstance } = {}

    function ParentConsumer() {
      const result = useRunEffect(Effect.map(SharedService, (s) => s))
      if (result._tag === "Success") capturedRefs.parent = result.value
      return <div data-testid="parent-ref">{result._tag}</div>
    }

    function ChildConsumer() {
      const result = useRunEffect(Effect.map(SharedService, (s) => s))
      if (result._tag === "Success") capturedRefs.child = result.value
      return <div data-testid="child-ref">{result._tag}</div>
    }

    render(
      <EffectProvider layer={ParentLayer}>
        <ParentConsumer />
        <EffectProvider layer={ChildLayer}>
          <ChildConsumer />
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("parent-ref").textContent).toBe("Success")
    expect(screen.getByTestId("child-ref").textContent).toBe("Success")

    // The critical assertion: both references point to the SAME object
    expect(capturedRefs.parent).toBe(capturedRefs.child)
    expect(capturedRefs.parent).toBe(sharedInstance)
  })

  it("parent and child scopes resolve same service tag to different values simultaneously", async () => {
    // Angular-style DI: same service tag resolves differently depending on
    // which EffectProvider scope the component lives in.

    class ThemeTag extends Context.Tag("ThemeTag")<
      ThemeTag,
      { readonly name: string }
    >() {}

    const LightLayer = Layer.succeed(ThemeTag, { name: "light" })
    const DarkLayer = Layer.succeed(ThemeTag, { name: "dark" })

    function ShowTheme({ testId }: { testId: string }) {
      const result = useRunEffect(Effect.map(ThemeTag, (t) => t.name))
      return (
        <div data-testid={testId}>
          {result._tag === "Success" ? result.value : result._tag}
        </div>
      )
    }

    render(
      <EffectProvider layer={LightLayer}>
        {/* Parent scope: resolves ThemeTag as "light" */}
        <ShowTheme testId="parent-theme" />
        <EffectProvider layer={DarkLayer}>
          {/* Child scope: overrides ThemeTag to "dark" */}
          <ShowTheme testId="child-theme" />
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // Both rendered simultaneously with different values for the same service tag
    expect(screen.getByTestId("parent-theme").textContent).toBe("light")
    expect(screen.getByTestId("child-theme").textContent).toBe("dark")
  })

  it("3-level deep nesting: each level inherits all ancestors and can override", async () => {
    // Level 1 provides A, Level 2 adds B, Level 3 adds C and overrides A.
    // The deepest component should see: A(overridden), B(inherited), C(own).

    class SvcA extends Context.Tag("SvcA-deep")<SvcA, { v: string }>() {}
    class SvcB extends Context.Tag("SvcB-deep")<SvcB, { v: string }>() {}
    class SvcC extends Context.Tag("SvcC-deep")<SvcC, { v: string }>() {}

    const Level1Layer = Layer.succeed(SvcA, { v: "A-from-L1" })
    const Level2Layer = Layer.succeed(SvcB, { v: "B-from-L2" })
    const Level3Layer = Layer.mergeAll(
      Layer.succeed(SvcC, { v: "C-from-L3" }),
      Layer.succeed(SvcA, { v: "A-overridden-L3" }), // override L1's SvcA
    )

    function ShowAll({ testId }: { testId: string }) {
      const a = useRunEffect(Effect.map(SvcA, (s) => s.v))
      const b = useRunEffect(Effect.map(SvcB, (s) => s.v))
      const c = useRunEffect(Effect.map(SvcC, (s) => s.v))
      return (
        <div data-testid={testId}>
          {[a, b, c].every((r) => r._tag === "Success")
            ? `${(a as any).value},${(b as any).value},${(c as any).value}`
            : "loading"}
        </div>
      )
    }

    function ShowA({ testId }: { testId: string }) {
      const a = useRunEffect(Effect.map(SvcA, (s) => s.v))
      return (
        <div data-testid={testId}>
          {a._tag === "Success" ? a.value : a._tag}
        </div>
      )
    }

    render(
      <EffectProvider layer={Level1Layer}>
        <ShowA testId="L1-a" />
        <EffectProvider layer={Level2Layer}>
          <ShowA testId="L2-a" />
          <EffectProvider layer={Level3Layer}>
            <ShowAll testId="L3-all" />
            <ShowA testId="L3-a" />
          </EffectProvider>
        </EffectProvider>
      </EffectProvider>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 150))
    })

    // Level 1: only has SvcA
    expect(screen.getByTestId("L1-a").textContent).toBe("A-from-L1")
    // Level 2: inherits SvcA from L1 (same value)
    expect(screen.getByTestId("L2-a").textContent).toBe("A-from-L1")
    // Level 3: SvcA overridden, SvcB inherited from L2, SvcC own
    expect(screen.getByTestId("L3-a").textContent).toBe("A-overridden-L3")
    expect(screen.getByTestId("L3-all").textContent).toBe(
      "A-overridden-L3,B-from-L2,C-from-L3",
    )
  })

  it("runtime is NOT recreated when parent re-renders with stable layer ref", async () => {
    // Stable layer (module-level constant) should keep the same runtime across re-renders.
    const StableLayer = Layer.empty

    const runtimeRefs: Array<import("effect").ManagedRuntime.ManagedRuntime<any, any>> = []

    function RuntimeTracker() {
      const rt = useEffectRuntime()
      runtimeRefs.push(rt)
      return null
    }

    function Parent() {
      const [count, setCount] = React.useState(0)
      return (
        <EffectProvider layer={StableLayer}>
          <RuntimeTracker />
          <button onClick={() => setCount((c) => c + 1)}>rerender</button>
          <div data-testid="count">{count}</div>
        </EffectProvider>
      )
    }

    render(<Parent />)

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const firstRuntime = runtimeRefs[runtimeRefs.length - 1]

    // Trigger 3 re-renders
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        screen.getByText("rerender").click()
        await new Promise((r) => setTimeout(r, 10))
      })
    }

    expect(screen.getByTestId("count").textContent).toBe("3")
    // Every captured runtime should be the SAME reference
    expect(runtimeRefs.length).toBeGreaterThan(1)
    for (const rt of runtimeRefs) {
      expect(rt).toBe(firstRuntime)
    }
  })

  it("runtime IS recreated when layer is an inline expression (unstable ref)", async () => {
    // Inline Layer.mergeAll(...) creates a new object every render → runtime recreated.
    class InlineSvc extends Context.Tag("InlineSvc")<
      InlineSvc,
      { readonly v: string }
    >() {}

    const runtimeRefs: Array<import("effect").ManagedRuntime.ManagedRuntime<any, any>> = []

    function RuntimeTracker() {
      const rt = useEffectRuntime()
      runtimeRefs.push(rt)
      return null
    }

    function Parent() {
      const [count, setCount] = React.useState(0)
      // ❌ Inline layer — new reference every render
      const layer = Layer.succeed(InlineSvc, { v: "hello" })
      return (
        <EffectProvider layer={layer}>
          <RuntimeTracker />
          <button onClick={() => setCount((c) => c + 1)}>rerender</button>
          <div data-testid="count">{count}</div>
        </EffectProvider>
      )
    }

    render(<Parent />)

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const firstRuntime = runtimeRefs[runtimeRefs.length - 1]

    // Trigger a re-render
    await act(async () => {
      screen.getByText("rerender").click()
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.getByTestId("count").textContent).toBe("1")
    // Runtime should have CHANGED because layer is a new object
    const lastRuntime = runtimeRefs[runtimeRefs.length - 1]
    expect(lastRuntime).not.toBe(firstRuntime)
  })

  it("nested runtime is stable when neither parent nor child layer changes", async () => {
    const ParentLayer = Layer.succeed(
      Context.GenericTag<{ v: string }>("StableParentSvc"),
      { v: "p" },
    )
    const ChildLayer = Layer.succeed(
      Context.GenericTag<{ v: string }>("StableChildSvc"),
      { v: "c" },
    )

    const parentRefs: Array<any> = []
    const childRefs: Array<any> = []

    function ParentTracker() {
      parentRefs.push(useEffectRuntime())
      return null
    }

    function ChildTracker() {
      childRefs.push(useEffectRuntime())
      return null
    }

    function Wrapper() {
      const [count, setCount] = React.useState(0)
      return (
        <EffectProvider layer={ParentLayer}>
          <ParentTracker />
          <EffectProvider layer={ChildLayer}>
            <ChildTracker />
          </EffectProvider>
          <button onClick={() => setCount((c) => c + 1)}>rerender</button>
          <div data-testid="count">{count}</div>
        </EffectProvider>
      )
    }

    render(<Wrapper />)

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const firstParent = parentRefs[parentRefs.length - 1]
    const firstChild = childRefs[childRefs.length - 1]

    // Trigger re-renders
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        screen.getByText("rerender").click()
        await new Promise((r) => setTimeout(r, 10))
      })
    }

    // Both parent and child runtimes should be STABLE
    for (const rt of parentRefs) {
      expect(rt).toBe(firstParent)
    }
    for (const rt of childRefs) {
      expect(rt).toBe(firstChild)
    }
    // And they should be different from each other
    expect(firstParent).not.toBe(firstChild)
  })

  it("layer condition change causes child re-renders and effect re-runs", async () => {
    class ThemeSvc extends Context.Tag("ThemeSvc-perf")<
      ThemeSvc,
      { readonly name: string }
    >() {}

    const LightLayer = Layer.succeed(ThemeSvc, { name: "light" })
    const DarkLayer = Layer.succeed(ThemeSvc, { name: "dark" })

    let childRenderCount = 0
    let effectRunCount = 0

    function Child() {
      childRenderCount++
      const result = useRunEffect(
        Effect.map(ThemeSvc, (s) => s.name),
      )
      React.useEffect(() => {
        effectRunCount++
      })
      return (
        <div data-testid="theme">
          {result._tag === "Success" ? result.value : result._tag}
        </div>
      )
    }

    function Parent() {
      const [isDark, setIsDark] = React.useState(false)
      const layer = isDark ? DarkLayer : LightLayer
      return (
        <EffectProvider layer={layer}>
          <Child />
          <button onClick={() => setIsDark((d) => !d)}>toggle</button>
        </EffectProvider>
      )
    }

    render(<Parent />)

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("theme").textContent).toBe("light")
    const rendersBeforeToggle = childRenderCount
    const effectsBeforeToggle = effectRunCount

    // Toggle to dark
    await act(async () => {
      screen.getByText("toggle").click()
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(screen.getByTestId("theme").textContent).toBe("dark")

    const rendersAfterToggle = childRenderCount - rendersBeforeToggle
    const effectsAfterToggle = effectRunCount - effectsBeforeToggle

    // Verify: child re-rendered AND effects re-ran due to runtime change.
    // This is correct behavior — layer changed → services changed → must re-run.
    // Renders: (1) context change, (2) Loading state, (3) Success state = 3
    // Effects: (1) deps-tracking effect, (2) useRunEffect re-run, (3) result update effect = 3
    expect(rendersAfterToggle).toBeGreaterThanOrEqual(2)
    expect(effectsAfterToggle).toBeGreaterThanOrEqual(2)
  })
})
