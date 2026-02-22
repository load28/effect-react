import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

/**
 * Effect-powered state hook — works like React's useState.
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
 * @example
 * ```tsx
 * import { useEffectState } from 'effect-react'
 *
 * function Counter() {
 *   const [count, setCount] = useEffectState(
 *     Effect.flatMap(CounterService, (s) => s.get)
 *   )
 *
 *   if (count._tag !== 'Success') return <Spinner />
 *
 *   return (
 *     <button onClick={() => setCount(
 *       Effect.flatMap(CounterService, (s) => s.increment)
 *     )}>
 *       Count: {count.value}
 *     </button>
 *   )
 * }
 * ```
 */
export function useEffectState<A, E, R>(
  initialEffect: Effect.Effect<A, E, R>,
): [EffectResult<A, E>, (next: A | Effect.Effect<A, E, R>) => void] {
  const runtime = useEffectRuntime<R, never>()

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<A, E>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<A, E>>(Loading as EffectResult<A, E>)
  }
  const store = storeRef.current

  // Subscribe to the reactive store
  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  // Capture the initial effect in a ref to avoid re-running on every render
  const initialEffectRef = React.useRef(initialEffect)

  // Run the initial effect once on mount
  React.useEffect(() => {
    const fiber = runtime.runFork(initialEffectRef.current)

    fiber.addObserver((exit) => {
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
  }, [runtime, store])

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
        const fiber = runtime.runFork(next)
        fiberRef.current = fiber
        fiber.addObserver((exit) => {
          fiberRef.current = null
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
    [runtime, store],
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

  return [result, setState]
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
