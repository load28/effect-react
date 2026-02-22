import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

export interface UseRunEffectOptions {
  /**
   * Dependencies array, similar to React's useEffect deps.
   * The effect re-runs when any dependency changes.
   * If omitted, the effect runs once on mount.
   */
  readonly deps?: ReadonlyArray<unknown>
}

/**
 * Runs an Effect and returns a Result<A, E> that tracks loading/success/failure.
 *
 * The effect is automatically:
 * - Executed when the component mounts (or deps change)
 * - Interrupted when the component unmounts or deps change
 * - Re-executed on dependency changes
 *
 * Internally uses a component-scoped reactive store (SubscriptionRef principles)
 * with useSyncExternalStore for tear-free, consistent reads.
 *
 * @example
 * ```tsx
 * import { useRunEffect } from 'effect-react'
 *
 * function UserProfile({ userId }: { userId: string }) {
 *   const result = useRunEffect(getUserById(userId), { deps: [userId] })
 *
 *   if (result._tag === 'Loading') return <Spinner />
 *   if (result._tag === 'Failure') return <Error error={result.error} />
 *   return <Profile user={result.value} />
 * }
 * ```
 */
export function useRunEffect<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: UseRunEffectOptions,
): EffectResult<A, E> {
  const runtime = useEffectRuntime<R, never>()
  const deps = options?.deps

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<A, E>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<A, E>>(Loading as EffectResult<A, E>)
  }
  const store = storeRef.current

  // Subscribe to the reactive store — re-renders when store.set() is called
  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  React.useEffect(() => {
    store.set(Loading as EffectResult<A, E>)

    const fiber = runtime.runFork(effect)

    fiber.addObserver((exit) => {
      if (Exit.isSuccess(exit)) {
        store.set(Success(exit.value) as EffectResult<A, E>)
      } else {
        const cause = exit.cause
        if (Cause.isInterruptedOnly(cause)) {
          return
        }
        const failure = Cause.failureOption(cause)
        if (failure._tag === "Some") {
          store.set(Failure(failure.value) as EffectResult<A, E>)
        }
      }
    })

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ? [runtime, ...deps] : [runtime])

  return result
}
