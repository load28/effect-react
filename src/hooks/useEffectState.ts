import * as React from "react"
import type { Effect } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"

/**
 * Synchronous Effect-powered state hook — returns the value directly, no Loading state.
 *
 * Use this hook when the Effect is synchronous (Effect.sync, Effect.succeed, etc.).
 * The initial Effect is executed immediately via `runSync`, and the value is available
 * on the first render — no Loading/Success/Failure wrapper needed.
 *
 * For async Effects (API calls, timers, service lookups), use `useEffectStateAsync` instead.
 *
 * @throws If the initial Effect or a setter Effect is async (runSync will throw)
 *
 * @example
 * ```tsx
 * import { useEffectState } from 'effect-react'
 * import { Effect } from 'effect'
 *
 * function Counter() {
 *   const [count, setCount] = useEffectState(Effect.succeed(0))
 *
 *   return (
 *     <button onClick={() => setCount(Effect.succeed(count + 1))}>
 *       Count: {count}
 *     </button>
 *   )
 * }
 * ```
 */
export function useEffectState<A, E, R>(
  initialEffect: Effect.Effect<A, E, R>,
): [A, (next: A | Effect.Effect<A, E, R>) => void] {
  const runtime = useEffectRuntime<R, never>()

  const [state, setState] = React.useState<A>(() =>
    runtime.runSync(initialEffect),
  )

  const setEffectState = React.useCallback(
    (next: A | Effect.Effect<A, E, R>) => {
      if (isEffect(next)) {
        setState(runtime.runSync(next))
      } else {
        setState(next)
      }
    },
    [runtime],
  )

  return [state, setEffectState]
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
