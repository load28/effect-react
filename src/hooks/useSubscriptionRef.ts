import * as React from "react"
import { Effect, Stream, type SubscriptionRef } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success } from "../types.js"
import { createComponentStore } from "../reactive.js"

/**
 * Subscribes to an Effect SubscriptionRef and reactively tracks its value.
 *
 * When the SubscriptionRef's value changes (via set/update), this hook
 * automatically re-renders the component with the new value.
 * No refresh keys or manual re-fetching needed.
 *
 * The subscription is component-scoped: created on mount, cleaned up on unmount.
 * Each component instance gets its own independent subscription.
 *
 * Accepts `undefined` to support cases where the ref is not yet available
 * (e.g., waiting for a service to load). Returns Loading until a ref is provided.
 *
 * @example
 * ```tsx
 * import { useSubscriptionRef, useService } from 'effect-react'
 *
 * function Counter() {
 *   const svc = useService(CounterService)
 *   const count = useSubscriptionRef(
 *     svc._tag === "Success" ? svc.value.countRef : undefined
 *   )
 *   // Automatically updates when countRef is modified
 * }
 * ```
 */
export function useSubscriptionRef<A>(
  ref: SubscriptionRef.SubscriptionRef<A> | undefined,
): EffectResult<A, never> {
  const runtime = useEffectRuntime()

  // Component-scoped reactive store (Ref + PubSub pattern)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<A, never>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<A, never>>(Loading as EffectResult<A, never>)
  }
  const store = storeRef.current

  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  React.useEffect(() => {
    if (!ref) {
      store.set(Loading as EffectResult<A, never>)
      return
    }

    // Subscribe to the SubscriptionRef's changes stream.
    // ref.changes emits the current value first, then all subsequent updates.
    // Each value published to the internal PubSub triggers store.set → React re-render.
    const fiber = runtime.runFork(
      Stream.runForEach(ref.changes, (value) =>
        Effect.sync(() => {
          store.set(Success(value) as EffectResult<A, never>)
        }),
      ),
    )

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
  }, [runtime, ref, store])

  return result
}
