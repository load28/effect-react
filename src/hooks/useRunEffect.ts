import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"

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
  const [result, setResult] = React.useState<EffectResult<A, E>>(Loading as EffectResult<A, E>)
  const deps = options?.deps

  React.useEffect(() => {
    setResult(Loading as EffectResult<A, E>)

    const fiber = runtime.runFork(effect)

    fiber.addObserver((exit) => {
      if (Exit.isSuccess(exit)) {
        setResult(Success(exit.value) as EffectResult<A, E>)
      } else {
        // Don't update state for interruption — component is unmounting
        const cause = exit.cause
        if (Cause.isInterruptedOnly(cause)) {
          return
        }
        // Extract the first error from the cause
        const failure = Cause.failureOption(cause)
        if (failure._tag === "Some") {
          setResult(Failure(failure.value) as EffectResult<A, E>)
        }
      }
    })

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? [])

  return result
}
