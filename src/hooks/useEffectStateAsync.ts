import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

/**
 * Async Effect-powered state hook — wraps results in EffectResult (Loading | Success | Failure).
 *
 * Use this hook when the Effect involves async operations (API calls, timers, etc.).
 * For synchronous Effects, use `useEffectState` instead — it returns the value directly.
 *
 * Runs the initial Effect to populate the state, then provides a setter
 * that can accept either a plain value or an Effect that produces the new value.
 *
 * When the setter receives an Effect, the current value stays visible
 * while the effect runs (no Loading flash) — just like useState where
 * the old value remains until the new one is ready.
 * Loading state only appears during the initial effect execution.
 *
 * Internally uses a component-scoped reactive store (SubscriptionRef principles)
 * with useSyncExternalStore for tear-free, consistent reads.
 *
 * Returns `[result, setter, isPending]`:
 * - `result`: EffectResult (Loading | Success | Failure)
 * - `setter`: accepts a plain value or an Effect
 * - `isPending`: true while any Effect is in flight — initial load or setter (use for disabling buttons, etc.)
 *
 * @example
 * ```tsx
 * import { useEffectStateAsync } from 'effect-react'
 *
 * function TodoList() {
 *   const [todos, setTodos, isPending] = useEffectStateAsync(
 *     Effect.flatMap(TodoService, (s) => s.getAll)
 *   )
 *
 *   if (todos._tag !== 'Success') return <Spinner />
 *
 *   return (
 *     <button
 *       disabled={isPending}
 *       onClick={() => setTodos(
 *         Effect.flatMap(TodoService, (s) => s.refetch)
 *       )}
 *     >
 *       Refresh
 *     </button>
 *   )
 * }
 * ```
 */
export function useEffectStateAsync<A, E, R>(
  initialEffect: Effect.Effect<A, E, R>,
): [EffectResult<A, E>, (next: A | Effect.Effect<A, E, R>) => void, boolean] {
  const runtime = useEffectRuntime<R, never>()

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<A, E>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<A, E>>(Loading as EffectResult<A, E>)
  }
  const store = storeRef.current

  // Pending store — tracks whether any Effect is in flight (initial or setter)
  const pendingStoreRef = React.useRef<ReturnType<typeof createComponentStore<boolean>> | null>(null)
  if (!pendingStoreRef.current) {
    pendingStoreRef.current = createComponentStore<boolean>(true)
  }
  const pendingStore = pendingStoreRef.current

  // Subscribe to the reactive stores
  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const isPending = React.useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot, pendingStore.getSnapshot)

  // Capture the initial effect in a ref to avoid re-running on every render
  const initialEffectRef = React.useRef(initialEffect)

  // Run the initial effect once on mount
  React.useEffect(() => {
    const fiber = runtime.runFork(initialEffectRef.current)

    fiber.addObserver((exit) => {
      pendingStore.set(false)
      if (Exit.isSuccess(exit)) {
        store.set(Success(exit.value) as EffectResult<A, E>)
      } else {
        if (Cause.isInterruptedOnly(exit.cause)) return
        const failure = Cause.failureOption(exit.cause)
        if (failure._tag === "Some") {
          store.set(Failure(failure.value) as EffectResult<A, E>)
        }
      }
    })

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
  }, [runtime, store, pendingStore])

  const fiberRef = React.useRef<import("effect").Fiber.RuntimeFiber<A, E> | null>(null)

  const setState = React.useCallback(
    (next: A | Effect.Effect<A, E, R>) => {
      // Interrupt previous setter-effect if still running
      if (fiberRef.current) {
        fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
        fiberRef.current = null
      }

      if (isEffect(next)) {
        // Keep current value visible while effect runs — like useState.
        // No Loading flash. The old value stays until the new one arrives.
        pendingStore.set(true)
        const fiber = runtime.runFork(next)
        fiberRef.current = fiber
        fiber.addObserver((exit) => {
          fiberRef.current = null
          pendingStore.set(false)
          if (Exit.isSuccess(exit)) {
            store.set(Success(exit.value) as EffectResult<A, E>)
          } else {
            if (Cause.isInterruptedOnly(exit.cause)) return
            const failure = Cause.failureOption(exit.cause)
            if (failure._tag === "Some") {
              store.set(Failure(failure.value) as EffectResult<A, E>)
            }
          }
        })
      } else {
        // Plain value — instant update, exactly like useState
        store.set(Success(next) as EffectResult<A, E>)
      }
    },
    [runtime, store, pendingStore],
  )

  // Cleanup setter fiber on unmount
  React.useEffect(() => {
    return () => {
      if (fiberRef.current) {
        fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
        fiberRef.current = null
      }
    }
  }, [])

  return [result, setState, isPending]
}

/**
 * Duck-type check for Effect values.
 * Effects have a `_op` property and implement the Effect protocol.
 */
function isEffect(value: unknown): value is Effect.Effect<any, any, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_op" in value &&
    typeof (value as any)[Symbol.iterator] === "function"
  )
}
