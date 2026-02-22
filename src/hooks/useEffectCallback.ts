import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import type { Fiber } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

export interface UseEffectCallbackReturn<A, E, Args extends ReadonlyArray<unknown>> {
  /** Execute the effect with the given arguments */
  readonly run: (...args: Args) => void
  /** Current result state */
  readonly result: EffectResult<A, E>
  /** Whether the effect is currently running */
  readonly isLoading: boolean
  /** Reset the result back to initial state */
  readonly reset: () => void
}

type Initial = { readonly _tag: "Initial" }
const Initial: Initial = { _tag: "Initial" }

type CallbackState<A, E> = Initial | EffectResult<A, E>

/**
 * Creates a callback that runs an Effect when invoked.
 *
 * Unlike useRunEffect which runs automatically, useEffectCallback gives you
 * a function to trigger the effect manually (e.g., on button click).
 *
 * Internally uses a component-scoped reactive store (SubscriptionRef principles)
 * with useSyncExternalStore for tear-free, consistent reads.
 *
 * @example
 * ```tsx
 * import { useEffectCallback } from 'effect-react'
 *
 * function DeleteButton({ userId }: { userId: string }) {
 *   const { run, result, isLoading } = useEffectCallback(
 *     (id: string) => deleteUser(id)
 *   )
 *
 *   return (
 *     <button onClick={() => run(userId)} disabled={isLoading}>
 *       {isLoading ? 'Deleting...' : 'Delete'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useEffectCallback<A, E, R, Args extends ReadonlyArray<unknown>>(
  fn: (...args: Args) => Effect.Effect<A, E, R>,
): UseEffectCallbackReturn<A, E, Args> {
  const runtime = useEffectRuntime<R, never>()

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<CallbackState<A, E>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<CallbackState<A, E>>(Initial)
  }
  const store = storeRef.current

  // Subscribe to the reactive store
  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const fiberRef = React.useRef<Fiber.RuntimeFiber<A, E> | null>(null)

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (fiberRef.current) {
        fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
        fiberRef.current = null
      }
    }
  }, [])

  const run = React.useCallback(
    (...args: Args) => {
      // Interrupt previous execution if still running
      if (fiberRef.current) {
        fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
      }

      store.set(Loading as EffectResult<A, E>)

      const effect = fn(...args)
      const fiber = runtime.runFork(effect)
      fiberRef.current = fiber

      fiber.addObserver((exit) => {
        fiberRef.current = null
        if (Exit.isSuccess(exit)) {
          store.set(Success(exit.value) as EffectResult<A, E>)
        } else {
          if (Cause.isInterruptedOnly(exit.cause)) {
            return
          }
          const failure = Cause.failureOption(exit.cause)
          if (failure._tag === "Some") {
            store.set(Failure(failure.value) as EffectResult<A, E>)
          }
        }
      })
    },
    [runtime, fn, store],
  )

  const reset = React.useCallback(() => {
    if (fiberRef.current) {
      fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
      fiberRef.current = null
    }
    store.set(Initial)
  }, [store])

  const isLoading = state._tag === "Loading"
  const result: EffectResult<A, E> =
    state._tag === "Initial" ? (Loading as EffectResult<A, E>) : state

  return { run, result, isLoading, reset }
}
